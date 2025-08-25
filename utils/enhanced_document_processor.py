import os
import fitz  # PyMuPDF for PDF processing
from docx import Document
from pathlib import Path
import mimetypes
from utils.document_processor import DocumentProcessor

class EnhancedDocumentProcessor(DocumentProcessor):
    """Enhanced document processor supporting multiple file formats"""
    
    def __init__(self):
        super().__init__()
        self.supported_formats = {
            '.pdf': self._process_pdf,
            '.docx': self._process_docx,
            '.doc': self._process_doc,
            '.txt': self._process_txt,
            '.md': self._process_markdown,
            '.rtf': self._process_rtf
        }
    
    def process_document(self, file_path):
        """Process document based on file extension"""
        try:
            file_ext = Path(file_path).suffix.lower()
            
            if file_ext not in self.supported_formats:
                raise ValueError(f"Unsupported file format: {file_ext}")
            
            # Extract text using appropriate method
            text_content = self.supported_formats[file_ext](file_path)
            
            if not text_content:
                raise ValueError("No text content extracted from document")
            
            # Process text into chunks with embeddings
            processed_chunks = []
            
            for paragraph in text_content:
                if paragraph.strip():
                    processed_text = self.preprocess_text(paragraph)
                    chunks = self.chunk_text(processed_text)
                    
                    for chunk in chunks:
                        if chunk.strip():
                            embedding = self.get_embedding(chunk)
                            if embedding:
                                processed_chunks.append({
                                    'text': chunk,
                                    'original_text': paragraph,
                                    'file_type': file_ext,
                                    'embedding': embedding
                                })
            
            return processed_chunks
            
        except Exception as e:
            print(f"Error processing document: {str(e)}")
            return []
    
    def _process_pdf(self, file_path):
        """Extract text from PDF using PyMuPDF"""
        try:
            doc = fitz.open(file_path)
            text_content = []
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text()
                
                if text.strip():
                    # Split by paragraphs (double newlines)
                    paragraphs = text.split('\n\n')
                    for para in paragraphs:
                        if para.strip():
                            text_content.append(para.strip())
            
            doc.close()
            return text_content
            
        except Exception as e:
            print(f"Error processing PDF: {str(e)}")
            return []
    
    def _process_docx(self, file_path):
        """Extract text from DOCX file"""
        return self.extract_text_from_docx(file_path)
    
    def _process_doc(self, file_path):
        """Extract text from DOC file (legacy format)"""
        try:
            # For .doc files, we'd need python-docx2txt or similar
            # For now, return empty and suggest converting to .docx
            print("Legacy .doc format not fully supported. Please convert to .docx")
            return []
        except Exception as e:
            print(f"Error processing DOC: {str(e)}")
            return []
    
    def _process_txt(self, file_path):
        """Extract text from plain text file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Split by paragraphs
            paragraphs = content.split('\n\n')
            return [para.strip() for para in paragraphs if para.strip()]
            
        except Exception as e:
            print(f"Error processing TXT: {str(e)}")
            return []
    
    def _process_markdown(self, file_path):
        """Extract text from Markdown file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Remove markdown formatting (basic)
            import re
            # Remove headers
            content = re.sub(r'^#+\s*', '', content, flags=re.MULTILINE)
            # Remove bold/italic
            content = re.sub(r'\*\*(.*?)\*\*', r'\1', content)
            content = re.sub(r'\*(.*?)\*', r'\1', content)
            # Remove links
            content = re.sub(r'\[([^\]]+)\]\([^\)]+\)', r'\1', content)
            
            # Split by paragraphs
            paragraphs = content.split('\n\n')
            return [para.strip() for para in paragraphs if para.strip()]
            
        except Exception as e:
            print(f"Error processing Markdown: {str(e)}")
            return []
    
    def _process_rtf(self, file_path):
        """Extract text from RTF file"""
        try:
            # RTF processing would require striprtf or similar library
            print("RTF format not fully supported yet")
            return []
        except Exception as e:
            print(f"Error processing RTF: {str(e)}")
            return []
    
    def get_document_metadata(self, file_path):
        """Extract metadata from document"""
        try:
            file_path = Path(file_path)
            stat = file_path.stat()
            
            metadata = {
                'filename': file_path.name,
                'file_size': stat.st_size,
                'file_type': file_path.suffix.lower(),
                'mime_type': mimetypes.guess_type(str(file_path))[0],
                'created_time': stat.st_ctime,
                'modified_time': stat.st_mtime
            }
            
            # Add format-specific metadata
            if file_path.suffix.lower() == '.pdf':
                metadata.update(self._get_pdf_metadata(file_path))
            elif file_path.suffix.lower() == '.docx':
                metadata.update(self._get_docx_metadata(file_path))
            
            return metadata
            
        except Exception as e:
            print(f"Error getting document metadata: {str(e)}")
            return {}
    
    def _get_pdf_metadata(self, file_path):
        """Get PDF-specific metadata"""
        try:
            doc = fitz.open(str(file_path))
            metadata = doc.metadata
            page_count = len(doc)
            doc.close()
            
            return {
                'page_count': page_count,
                'title': metadata.get('title', ''),
                'author': metadata.get('author', ''),
                'subject': metadata.get('subject', ''),
                'creator': metadata.get('creator', '')
            }
        except:
            return {}
    
    def _get_docx_metadata(self, file_path):
        """Get DOCX-specific metadata"""
        try:
            doc = Document(str(file_path))
            core_props = doc.core_properties
            
            return {
                'title': core_props.title or '',
                'author': core_props.author or '',
                'subject': core_props.subject or '',
                'created': core_props.created,
                'modified': core_props.modified,
                'word_count': len(doc.paragraphs)
            }
        except:
            return {}