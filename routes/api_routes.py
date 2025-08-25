import uuid
from flask import Blueprint, request, jsonify, session, Response
from services.chat_service import ChatService
from services.file_service import FileService
from services.web_search_service import WebSearchService
from services.code_processor import CodeProcessor
from utils.enhanced_document_processor import EnhancedDocumentProcessor
from utils.enhanced_vector_store import EnhancedVectorStore
from utils.database import DatabaseManager
import json
import time
import zipfile
import tempfile

api_bp = Blueprint('api', __name__)
chat_service = ChatService()
file_service = FileService()
web_search_service = WebSearchService()
code_processor = CodeProcessor()
enhanced_doc_processor = EnhancedDocumentProcessor()
enhanced_vector_store = EnhancedVectorStore()
db_manager = DatabaseManager()

@api_bp.route('/send_message', methods=['POST'])
def send_message():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        stream = data.get('stream', False)

        if stream:
            return Response(
                stream_chat_response(user_message, session['user_id'], session['session_id']),
                mimetype='text/stream'
            )
        else:
            result = chat_service.process_message(
                user_message, 
                session['user_id'], 
                session['session_id']
            )
            return jsonify(result)

    except Exception as e:
        print(f"[send_message] Error: {e}")
        return jsonify({'error': 'Failed to process message'}), 500

def stream_chat_response(user_message, user_id, session_id):
    """Generator function for streaming chat responses"""
    try:
        # Save user message
        db_manager.save_message(user_id, session_id, 'user', user_message)

        # Get chat history for context
        history = db_manager.get_session_messages(user_id, session_id)
        memory_context = "\n".join([f"{m['role'].capitalize()}: {m['message']}" for m in history[-10:]])

        # Get relevant documents from vector store
        vector_context = ""
        if chat_service.vector_store.collection_exists(session_id):
            relevant_docs = chat_service.vector_store.search_documents(session_id, user_message)
            vector_context = "\n".join([doc.get('text', '') for doc in relevant_docs])

        # Combine contexts
        full_context = f"Chat History:\n{memory_context.strip()}\n\nRelevant Docs:\n{vector_context.strip()}"
        
        # Generate streaming response
        full_response = ""
        for chunk in chat_service.llm_service.generate_streaming_response(user_message, full_context):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk})}\n\n"
            time.sleep(0.05)  # Small delay to simulate realistic streaming

        # Save complete AI response
        db_manager.save_message(user_id, session_id, 'assistant', full_response)
        
        yield f"data: [DONE]\n\n"

    except Exception as e:
        print(f"[stream_chat_response] Error: {e}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"

@api_bp.route('/web_search', methods=['POST'])
def web_search():
    """Perform web search using Serper API"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401

    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        # Perform web search
        search_results = web_search_service.search(query)
        
        if search_results.get('error'):
            return jsonify({
                'error': search_results['error'],
                'query': query
            }), 500
        
        # Format search context for LLM
        search_context = web_search_service.format_search_context(search_results)
        
        # Generate AI response with search context
        ai_response = chat_service.llm_service.generate_response(
            f"Based on the web search results, please answer: {query}",
            search_context
        )
        
        # Save search query and response to chat history
        db_manager.save_message(session['user_id'], session['session_id'], 'user', f"🔍 Web Search: {query}")
        db_manager.save_message(session['user_id'], session['session_id'], 'assistant', ai_response)
        
        result = {
            'query': query,
            'search_results': search_results['results'],
            'ai_response': ai_response,
            'message': f'🔍 Found {len(search_results["results"])} results for "{query}"'
        }
        
        return jsonify(result)

    except Exception as e:
        print(f"[web_search] Error: {e}")
        return jsonify({'error': 'Failed to perform web search'}), 500

@api_bp.route('/upload_file', methods=['POST'])
def upload_file():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        file = request.files.get('file')
        result = file_service.process_uploaded_file(
            file, 
            session['session_id'], 
            session['user_id']
        )

        # Save document info to database
        if result['type'] == 'document':
            db_manager.save_document(
                session['user_id'],
                session['session_id'],
                result['filename'],
                file.content_type,
                0  # Size already calculated in service
            )

        return jsonify(result)
    except Exception as e:
        print(f"[upload_file] Error: {e}")
        return jsonify({'error': str(e)}), 400

@api_bp.route('/upload_document', methods=['POST'])
def upload_document():
    """Upload and process document for RAG"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        file = request.files.get('file')
        if not file or not file.filename:
            return jsonify({'error': 'No file uploaded'}), 400
        
        # Save file temporarily
        import tempfile
        import os
        from werkzeug.utils import secure_filename
        
        filename = secure_filename(file.filename)
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as tmp_file:
            file.save(tmp_file.name)
            
            try:
                # Process document
                processed_chunks = enhanced_doc_processor.process_document(tmp_file.name)
                
                if not processed_chunks:
                    return jsonify({'error': 'Failed to process document or no text content found'}), 400
                
                # Store in vector database
                success = enhanced_vector_store.add_documents(
                    session['session_id'], 
                    processed_chunks, 
                    filename,
                    "documents"
                )
                
                if success:
                    # Save document metadata
                    db_manager.save_document(
                        session['user_id'],
                        session['session_id'],
                        filename,
                        file.content_type or 'application/octet-stream',
                        len(file.read())
                    )
                    
                    return jsonify({
                        'message': f'Document "{filename}" processed successfully for RAG!',
                        'chunks': len(processed_chunks),
                        'filename': filename,
                        'type': 'document'
                    })
                else:
                    return jsonify({'error': 'Failed to store document in vector database'}), 500
                    
            finally:
                # Clean up temporary file
                os.unlink(tmp_file.name)
                
    except Exception as e:
        print(f"[upload_document] Error: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/upload_codebase', methods=['POST'])
def upload_codebase():
    """Upload and process codebase ZIP file"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        file = request.files.get('file')
        if not file or not file.filename:
            return jsonify({'error': 'No file uploaded'}), 400
        
        if not file.filename.lower().endswith('.zip'):
            return jsonify({'error': 'Only ZIP files are supported for codebase upload'}), 400
        
        # Save file temporarily
        import tempfile
        import os
        from werkzeug.utils import secure_filename
        
        filename = secure_filename(file.filename)
        with tempfile.NamedTemporaryFile(delete=False, suffix='.zip') as tmp_file:
            file.save(tmp_file.name)
            
            try:
                # Process codebase
                code_chunks = code_processor.process_zip_file(tmp_file.name, session['session_id'])
                
                if not code_chunks:
                    return jsonify({'error': 'No supported code files found in ZIP'}), 400
                
                # Store in vector database
                success = enhanced_vector_store.add_code_chunks(session['session_id'], code_chunks)
                
                if success:
                    return jsonify({
                        'message': f'Codebase "{filename}" processed successfully!',
                        'chunks': len(code_chunks),
                        'filename': filename,
                        'type': 'codebase'
                    })
                else:
                    return jsonify({'error': 'Failed to store codebase in vector database'}), 500
                    
            finally:
                # Clean up temporary file
                os.unlink(tmp_file.name)
                
    except Exception as e:
        print(f"[upload_codebase] Error: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/chat_with_documents', methods=['POST'])
def chat_with_documents():
    """Chat with uploaded documents using RAG"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Search relevant documents
        relevant_docs = enhanced_vector_store.search_documents(
            session['session_id'], 
            user_message, 
            "documents", 
            top_k=5
        )
        
        if not relevant_docs:
            return jsonify({
                'error': 'No documents found. Please upload documents first.',
                'message': user_message
            }), 400
        
        # Format context from documents
        doc_context = "\n\n".join([
            f"Document: {doc.get('filename', 'Unknown')}\n{doc['text']}"
            for doc in relevant_docs
        ])
        
        # Generate response with document context
        ai_response = chat_service.llm_service.generate_response(
            user_message,
            f"Document Context:\n{doc_context}"
        )
        
        # Save to chat history
        db_manager.save_message(session['user_id'], session['session_id'], 'user', f"📄 RAG Query: {user_message}")
        db_manager.save_message(session['user_id'], session['session_id'], 'assistant', ai_response)
        
        return jsonify({
            'user_message': user_message,
            'ai_response': ai_response,
            'relevant_documents': len(relevant_docs),
            'sources': [doc.get('filename', 'Unknown') for doc in relevant_docs]
        })
        
    except Exception as e:
        print(f"[chat_with_documents] Error: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/chat_with_code', methods=['POST'])
def chat_with_code():
    """Chat with uploaded codebase"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Search relevant code chunks
        relevant_code = enhanced_vector_store.search_documents(
            session['session_id'], 
            user_message, 
            "code", 
            top_k=5
        )
        
        if not relevant_code:
            return jsonify({
                'error': 'No codebase found. Please upload a codebase ZIP file first.',
                'message': user_message
            }), 400
        
        # Format context from code
        code_context = "\n\n".join([
            f"File: {code.get('file_path', 'Unknown')}\n```{code.get('file_type', '')}\n{code['text']}\n```"
            for code in relevant_code
        ])
        
        # Generate response with code context
        ai_response = chat_service.llm_service.generate_response(
            user_message,
            f"Codebase Context:\n{code_context}"
        )
        
        # Save to chat history
        db_manager.save_message(session['user_id'], session['session_id'], 'user', f"💻 Code Query: {user_message}")
        db_manager.save_message(session['user_id'], session['session_id'], 'assistant', ai_response)
        
        return jsonify({
            'user_message': user_message,
            'ai_response': ai_response,
            'relevant_files': len(relevant_code),
            'sources': [code.get('file_path', 'Unknown') for code in relevant_code]
        })
        
    except Exception as e:
        print(f"[chat_with_code] Error: {e}")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/get_chat_sessions')
def get_chat_sessions():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        sessions = chat_service.get_user_sessions(session['user_id'])
        return jsonify(sessions)
    except Exception as e:
        print(f"[get_chat_sessions] Error: {e}")
        return jsonify({'error': 'Failed to get chat sessions'}), 500

@api_bp.route('/load_session/<session_id>')
def load_session(session_id):
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    try:
        messages = chat_service.get_session_messages(session['user_id'], session_id)
        return jsonify(messages)
    except Exception as e:
        print(f"[load_session] Error: {e}")
        return jsonify({'error': 'Failed to load session'}), 500

@api_bp.route('/new_session')
def new_session():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    session['session_id'] = f"sess_{str(uuid.uuid4()).replace('-', '')}"
    return jsonify({'session_id': session['session_id']})

# Error handlers
@api_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@api_bp.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500