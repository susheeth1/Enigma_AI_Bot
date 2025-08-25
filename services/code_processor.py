import os
import zipfile
import tempfile
import shutil
from pathlib import Path
from utils.document_processor import DocumentProcessor

class CodeProcessor:
    """Service for processing code files and repositories"""
    
    def __init__(self):
        self.doc_processor = DocumentProcessor()
        self.supported_extensions = {
            '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.h',
            '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
            '.html', '.css', '.scss', '.less', '.xml', '.json', '.yaml', '.yml',
            '.md', '.txt', '.sql', '.sh', '.bat', '.dockerfile', '.gitignore'
        }
    
    def process_zip_file(self, zip_path, session_id):
        """Extract and process code files from zip"""
        try:
            with tempfile.TemporaryDirectory() as temp_dir:
                # Extract zip file
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                
                # Process extracted files
                code_chunks = []
                for root, dirs, files in os.walk(temp_dir):
                    # Skip common non-essential directories
                    dirs[:] = [d for d in dirs if not d.startswith('.') and d not in {
                        'node_modules', '__pycache__', 'venv', 'env', 'dist', 'build',
                        'target', 'bin', 'obj', '.git', '.svn', '.hg'
                    }]
                    
                    for file in files:
                        file_path = Path(root) / file
                        if self._should_process_file(file_path):
                            chunks = self._process_code_file(file_path, temp_dir)
                            code_chunks.extend(chunks)
                
                return code_chunks
                
        except Exception as e:
            print(f"Error processing zip file: {str(e)}")
            return []
    
    def _should_process_file(self, file_path):
        """Check if file should be processed"""
        # Check extension
        if file_path.suffix.lower() not in self.supported_extensions:
            return False
        
        # Check file size (skip very large files)
        try:
            if file_path.stat().st_size > 1024 * 1024:  # 1MB limit
                return False
        except:
            return False
        
        # Skip binary files
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                f.read(1024)  # Try to read first 1KB
            return True
        except:
            return False
    
    def _process_code_file(self, file_path, base_dir):
        """Process individual code file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Get relative path from base directory
            relative_path = os.path.relpath(file_path, base_dir)
            
            # Split content into chunks
            chunks = self._chunk_code(content, file_path.suffix)
            
            processed_chunks = []
            for i, chunk in enumerate(chunks):
                # Create embedding
                embedding = self.doc_processor.get_embedding(chunk)
                if embedding:
                    processed_chunks.append({
                        'text': chunk,
                        'original_text': content,
                        'file_path': relative_path,
                        'file_type': file_path.suffix,
                        'chunk_index': i,
                        'embedding': embedding
                    })
            
            return processed_chunks
            
        except Exception as e:
            print(f"Error processing file {file_path}: {str(e)}")
            return []
    
    def _chunk_code(self, content, file_extension, max_chunk_size=1000):
        """Split code into meaningful chunks"""
        lines = content.split('\n')
        chunks = []
        current_chunk = []
        current_size = 0
        
        for line in lines:
            line_size = len(line) + 1  # +1 for newline
            
            if current_size + line_size > max_chunk_size and current_chunk:
                # Save current chunk
                chunks.append('\n'.join(current_chunk))
                current_chunk = [line]
                current_size = line_size
            else:
                current_chunk.append(line)
                current_size += line_size
        
        # Add remaining chunk
        if current_chunk:
            chunks.append('\n'.join(current_chunk))
        
        return chunks
    
    def extract_code_structure(self, content, file_type):
        """Extract code structure (functions, classes, etc.)"""
        structure = {
            'functions': [],
            'classes': [],
            'imports': [],
            'comments': []
        }
        
        lines = content.split('\n')
        
        for i, line in enumerate(lines):
            stripped = line.strip()
            
            # Python-specific patterns
            if file_type == '.py':
                if stripped.startswith('def '):
                    structure['functions'].append({
                        'name': stripped.split('(')[0].replace('def ', ''),
                        'line': i + 1
                    })
                elif stripped.startswith('class '):
                    structure['classes'].append({
                        'name': stripped.split('(')[0].replace('class ', '').rstrip(':'),
                        'line': i + 1
                    })
                elif stripped.startswith(('import ', 'from ')):
                    structure['imports'].append(stripped)
                elif stripped.startswith('#'):
                    structure['comments'].append(stripped)
            
            # JavaScript/TypeScript patterns
            elif file_type in ['.js', '.ts', '.jsx', '.tsx']:
                if 'function ' in stripped or '=>' in stripped:
                    structure['functions'].append({
                        'name': self._extract_js_function_name(stripped),
                        'line': i + 1
                    })
                elif stripped.startswith('class '):
                    structure['classes'].append({
                        'name': stripped.split(' ')[1].split(' ')[0],
                        'line': i + 1
                    })
                elif stripped.startswith(('import ', 'require(')):
                    structure['imports'].append(stripped)
                elif stripped.startswith('//'):
                    structure['comments'].append(stripped)
        
        return structure
    
    def _extract_js_function_name(self, line):
        """Extract function name from JavaScript line"""
        try:
            if 'function ' in line:
                return line.split('function ')[1].split('(')[0].strip()
            elif '=>' in line and '=' in line:
                return line.split('=')[0].strip()
            return 'anonymous'
        except:
            return 'unknown'