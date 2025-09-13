import os

class Config:
    """Application configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-secret-key')
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', 500 * 1024 * 1024))  # 500MB for large repositories
    
    # Folder configurations
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'static/uploads')
    IMAGE_OUTPUT_FOLDER = 'static/generated_images'
    
    # API configurations
    GRADIO_CLIENT_URL = os.getenv("GRADIO_CLIENT_URL")
    LLM_SERVER_URL = os.getenv('LLM_SERVER_URL', 'http://localhost:8000/v1/chat/completions')
    LLM_MODEL_PATH = os.getenv('LLM_MODEL_PATH', '/root/.cache/huggingface/')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    SERPER_API_KEY = os.getenv('SERPER_API_KEY')
    
    # Nomic API configuration
    NOMIC_API_KEY = os.getenv('NOMIC_API_KEY')
    NOMIC_MODEL_NAME = os.getenv('NOMIC_MODEL_NAME', 'nomic-embed-text-v1.5')
    
    # Embedding configuration
    EMBEDDING_DEVICE = os.getenv('EMBEDDING_DEVICE', 'api')  # Using API instead of local
    
    @staticmethod
    def ensure_directories():
        """Create necessary directories"""
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(Config.IMAGE_OUTPUT_FOLDER, exist_ok=True)

# Initialize directories
Config.ensure_directories()