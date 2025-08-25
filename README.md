# Enigma AI Bot

A comprehensive AI-powered chatbot with multiple features including document processing, image generation, web search, and codebase interaction.

## 🚀 Features

- **Multi-Modal Chat**: Regular AI conversation with streaming responses
- **Image Generation**: AI-powered image creation with toggle control
- **Web Search**: Real-time web search using Serper API
- **RAG (Retrieval Augmented Generation)**: Chat with uploaded documents (PDF, DOCX, TXT, MD)
- **Codebase Chat**: Upload and interact with code repositories (ZIP files)
- **Theme Switching**: Multiple themes (White, Gray, Dark)
- **User Authentication**: Secure login/registration system
- **Vector Database**: Milvus integration for document and code embeddings

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd enigma-ai-bot
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Set up environment variables**
Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=enigma_ai_bot

# API Keys
OPENAI_API_KEY=your_openai_api_key
SERPER_API_KEY=your_serper_api_key
NOMIC_API_KEY=your_nomic_api_key

# LLM Configuration
LLM_SERVER_URL=http://localhost:8000/v1/chat/completions
LLM_MODEL_PATH=/root/.cache/huggingface/

# Nomic Embedding Configuration
NOMIC_MODEL_NAME=nomic-ai/nomic-embed-text-v1.5
EMBEDDING_DEVICE=cpu

# Image Generation
GRADIO_CLIENT_URL=your_gradio_url

# Milvus Configuration
MILVUS_HOST=localhost
MILVUS_PORT=19530

# Application Settings
SECRET_KEY=your_secret_key
DEBUG=true
```

4. **Set up the database**
```bash
# Import the database schema
mysql -u root -p < database_setup.sql
```

5. **Install NLTK data**
```python
import nltk
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')
```

## 🔧 Configuration

### API Keys Required:

1. **Serper API** (for web search): Get from https://serper.dev/api-keys
2. **Nomic API** (for embeddings): Get from https://atlas.nomic.ai/
3. **OpenAI API** (optional, for fallback): Get from https://platform.openai.com/

### Services Setup:

1. **MySQL Database**: For user authentication and chat history
2. **Milvus Vector Database**: For document and code embeddings
3. **Local LLM Server** (optional): For primary AI responses
4. **Gradio Server** (optional): for image generation

## 🚀 Usage

1. **Start the application**
```bash
python app.py
```

2. **Access the application**
Open your browser and go to `http://localhost:5000`

3. **Register/Login**
Create an account or login with existing credentials

4. **Use different modes**:
   - **Chat**: Regular AI conversation
   - **Image**: Generate images from text prompts
   - **Search**: Search the web and get AI-analyzed results
   - **RAG**: Upload documents and chat with them
   - **Code**: Upload code repositories and interact with them

## 📁 Project Structure

```
enigma-ai-bot/
├── app.py                          # Main application entry point
├── config/
│   └── settings.py                 # Configuration settings
├── routes/
│   ├── __init__.py
│   ├── auth_routes.py             # Authentication routes
│   ├── chat_routes.py             # Chat page routes
│   ├── image_routes.py            # Image generation routes
│   └── api_routes.py              # API endpoints
├── services/
│   ├── chat_service.py            # Chat logic
│   ├── file_service.py            # File processing
│   ├── image_service.py           # Image generation
│   ├── llm_service.py             # LLM interactions
│   ├── web_search_service.py      # Web search functionality
│   └── code_processor.py          # Code processing
├── utils/
│   ├── auth.py                    # Authentication utilities
│   ├── database.py                # Database operations
│   ├── document_processor.py      # Document processing
│   ├── enhanced_document_processor.py  # Enhanced document processing
│   ├── vector_store.py            # Vector database operations
│   ├── enhanced_vector_store.py   # Enhanced vector operations
│   └── image_processor.py         # Image processing utilities
├── templates/
│   ├── base.html                  # Base template
│   ├── login.html                 # Login page
│   └── chat.html                  # Main chat interface
├── static/
│   ├── css/
│   │   ├── main.css              # Main styles
│   │   ├── themes.css            # Theme styles
│   │   └── login.css             # Login page styles
│   └── js/
│       ├── chat.js               # Chat functionality
│       ├── theme-switcher.js     # Theme switching
│       └── login.js              # Login page functionality
└── requirements.txt               # Python dependencies
```

## 🔄 Mode Switching

The application supports 5 different modes:

1. **Chat Mode** 💬: Regular AI conversation with streaming responses
2. **Image Mode** 🎨: Generate images from text descriptions
3. **Search Mode** 🔍: Search the web and get AI-analyzed results
4. **RAG Mode** 📄: Upload and chat with documents
5. **Code Mode** 💻: Upload and interact with code repositories

## 🎨 Themes

Three built-in themes:
- **White Theme**: Light background with dark text
- **Gray Theme**: Gray background with dark text
- **Dark Theme**: Dark background with light text

## 🔒 Security Features

- Secure user authentication with password hashing
- Session management
- File upload validation
- SQL injection protection
- XSS protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please create an issue in the repository or contact the development team.