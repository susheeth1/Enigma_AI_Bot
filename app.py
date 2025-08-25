import os
from flask import Flask
from dotenv import load_dotenv
from config.settings import Config
from routes import register_routes
from utils.database import DatabaseManager

# Load environment variables
load_dotenv()

def create_app():
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Register all routes
    register_routes(app)
    
    return app

def main():
    app = create_app()
    
    # Log configuration
    print("🚀 Starting Enigma AI Bot...")
    print(f"📊 Nomic Model: {Config.NOMIC_MODEL_NAME}")
    print(f"🖥️ Embedding Device: {Config.EMBEDDING_DEVICE}")
    print(f"🔍 Serper API: {'✅ Configured' if Config.SERPER_API_KEY else '❌ Not configured'}")
    print(f"🔑 Nomic API: {'✅ Configured' if Config.NOMIC_API_KEY else '❌ Not configured'}")
    print(f"🤖 OpenAI API: {'✅ Configured' if Config.OPENAI_API_KEY else '❌ Not configured'}")
    
    try:
        db_manager = DatabaseManager()
        db_manager.init_database()
        print("Database initialized successfully!")
    except Exception as e:
        print(f"Database initialization error: {str(e)}")
    
    app.run(
        debug=os.getenv('DEBUG', 'true').lower() == 'true',
        host='0.0.0.0',
        port=5000
    )

if __name__ == '__main__':
    main()
