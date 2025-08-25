import os
import uuid
import re
from pymilvus import connections, Collection, CollectionSchema, FieldSchema, DataType, utility

class EnhancedVectorStore:
    """Enhanced vector store with support for different content types"""
    
    def __init__(self):
        self.host = os.getenv('MILVUS_HOST', 'localhost')
        self.port = os.getenv('MILVUS_PORT', '19530')
        self.connect_to_milvus()
    
    def connect_to_milvus(self):
        try:
            connections.connect(
                alias="default",
                host=self.host,
                port=self.port
            )
            print("✅ Connected to Milvus successfully")
        except Exception as e:
            print(f"❌ Error connecting to Milvus: {str(e)}")
            raise
    
    def _format_collection_name(self, session_id, content_type="general"):
        """Format collection name with content type"""
        safe_id = re.sub(r'[^a-zA-Z0-9_]', '', session_id)
        return f"{content_type}_{safe_id}"
    
    def create_document_collection_schema(self):
        """Schema for document collections"""
        fields = [
            FieldSchema(name="id", dtype=DataType.VARCHAR, max_length=100, is_primary=True),
            FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=5000),
            FieldSchema(name="original_text", dtype=DataType.VARCHAR, max_length=10000),
            FieldSchema(name="filename", dtype=DataType.VARCHAR, max_length=255),
            FieldSchema(name="file_type", dtype=DataType.VARCHAR, max_length=50),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=768)
        ]
        return CollectionSchema(fields=fields, description="Document embeddings collection")
    
    def create_code_collection_schema(self):
        """Schema for code collections"""
        fields = [
            FieldSchema(name="id", dtype=DataType.VARCHAR, max_length=100, is_primary=True),
            FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=5000),
            FieldSchema(name="original_text", dtype=DataType.VARCHAR, max_length=20000),
            FieldSchema(name="file_path", dtype=DataType.VARCHAR, max_length=500),
            FieldSchema(name="file_type", dtype=DataType.VARCHAR, max_length=50),
            FieldSchema(name="chunk_index", dtype=DataType.INT64),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=768)
        ]
        return CollectionSchema(fields=fields, description="Code embeddings collection")
    
    def create_collection(self, session_id, content_type="general"):
        """Create collection based on content type"""
        try:
            collection_name = self._format_collection_name(session_id, content_type)
            if utility.has_collection(collection_name):
                return Collection(collection_name)
            
            if content_type == "code":
                schema = self.create_code_collection_schema()
            else:
                schema = self.create_document_collection_schema()
            
            collection = Collection(collection_name, schema)
            
            index_params = {
                "index_type": "IVF_FLAT",
                "metric_type": "COSINE",
                "params": {"nlist": 1024}
            }
            collection.create_index(field_name="embedding", index_params=index_params)
            return collection
            
        except Exception as e:
            print(f"❌ Error creating collection: {str(e)}")
            raise
    
    def collection_exists(self, session_id, content_type="general"):
        """Check if collection exists"""
        try:
            collection_name = self._format_collection_name(session_id, content_type)
            return utility.has_collection(collection_name)
        except Exception as e:
            print(f"❌ Error checking collection existence: {str(e)}")
            return False
    
    def add_documents(self, session_id, documents, filename, content_type="documents"):
        """Add documents to collection"""
        try:
            collection = self.create_collection(session_id, content_type)
            
            ids = []
            texts = []
            original_texts = []
            filenames = []
            file_types = []
            embeddings = []
            
            for doc in documents:
                ids.append(str(uuid.uuid4()))
                texts.append(doc['text'])
                original_texts.append(doc['original_text'])
                filenames.append(filename)
                file_types.append(doc.get('file_type', ''))
                embeddings.append(doc['embedding'])
            
            data = [ids, texts, original_texts, filenames, file_types, embeddings]
            collection.insert(data)
            collection.flush()
            collection.load()
            
            print(f"✅ Added {len(documents)} documents to {content_type} collection")
            return True
            
        except Exception as e:
            print(f"❌ Error adding documents: {str(e)}")
            return False
    
    def add_code_chunks(self, session_id, code_chunks):
        """Add code chunks to collection"""
        try:
            collection = self.create_collection(session_id, "code")
            
            ids = []
            texts = []
            original_texts = []
            file_paths = []
            file_types = []
            chunk_indices = []
            embeddings = []
            
            for chunk in code_chunks:
                ids.append(str(uuid.uuid4()))
                texts.append(chunk['text'])
                original_texts.append(chunk['original_text'])
                file_paths.append(chunk['file_path'])
                file_types.append(chunk['file_type'])
                chunk_indices.append(chunk['chunk_index'])
                embeddings.append(chunk['embedding'])
            
            data = [ids, texts, original_texts, file_paths, file_types, chunk_indices, embeddings]
            collection.insert(data)
            collection.flush()
            collection.load()
            
            print(f"✅ Added {len(code_chunks)} code chunks to collection")
            return True
            
        except Exception as e:
            print(f"❌ Error adding code chunks: {str(e)}")
            return False
    
    def search_documents(self, session_id, query_text, content_type="documents", top_k=5):
        """Search documents in collection"""
        try:
            collection_name = self._format_collection_name(session_id, content_type)
            if not utility.has_collection(collection_name):
                return []
            
            collection = Collection(collection_name)
            collection.load()
            
            from utils.document_processor import DocumentProcessor
            doc_processor = DocumentProcessor()
            query_embedding = doc_processor.get_embedding(query_text)
            
            if not query_embedding:
                return []
            
            search_params = {
                "metric_type": "COSINE",
                "params": {"nprobe": 10}
            }
            
            if content_type == "code":
                output_fields = ["text", "original_text", "file_path", "file_type", "chunk_index"]
            else:
                output_fields = ["text", "original_text", "filename", "file_type"]
            
            results = collection.search(
                data=[query_embedding],
                anns_field="embedding",
                param=search_params,
                limit=top_k,
                output_fields=output_fields
            )
            
            documents = []
            for result in results[0]:
                doc_data = {
                    'text': result.entity.get('text'),
                    'original_text': result.entity.get('original_text'),
                    'score': result.score,
                    'content_type': content_type
                }
                
                if content_type == "code":
                    doc_data.update({
                        'file_path': result.entity.get('file_path'),
                        'file_type': result.entity.get('file_type'),
                        'chunk_index': result.entity.get('chunk_index')
                    })
                else:
                    doc_data.update({
                        'filename': result.entity.get('filename'),
                        'file_type': result.entity.get('file_type')
                    })
                
                documents.append(doc_data)
            
            return documents
            
        except Exception as e:
            print(f"❌ Error searching documents: {str(e)}")
            return []
    
    def delete_collection(self, session_id, content_type="general"):
        """Delete collection"""
        try:
            collection_name = self._format_collection_name(session_id, content_type)
            if utility.has_collection(collection_name):
                utility.drop_collection(collection_name)
                print(f"🧹 Deleted {content_type} collection {collection_name}")
            return True
        except Exception as e:
            print(f"❌ Error deleting collection: {str(e)}")
            return False
    
    def get_collection_stats(self, session_id, content_type="general"):
        """Get collection statistics"""
        try:
            collection_name = self._format_collection_name(session_id, content_type)
            if not utility.has_collection(collection_name):
                return None
            
            collection = Collection(collection_name)
            collection.load()
            
            return {
                'name': collection_name,
                'content_type': content_type,
                'num_entities': collection.num_entities,
                'description': collection.description
            }
        except Exception as e:
            print(f"❌ Error getting collection stats: {str(e)}")
            return None