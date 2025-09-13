/**
 * Complete Chat Interface with All Working Modes
 * Handles mode switching, file uploads, and all chat functionalities
 */

class ChatInterface {
    constructor() {
        this.isLoading = false;
        this.autoScroll = true;
        this.currentMode = 'chat';
        this.streamingMessage = null;
        this.settings = {
            imageGenEnabled: true,
            webSearchEnabled: true,
            ragEnabled: true,
            codeAnalysisEnabled: true,
            streamingEnabled: true
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadSettings();
        this.focusInput();
        this.updateModeButtons();
        this.updateUIForMode(this.currentMode);
    }

    bindEvents() {
        // Message input events
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
            messageInput.addEventListener('input', (e) => this.autoResize(e.target));
        }

        // Button events
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }

        // Mode selector events
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const mode = e.target.dataset.mode || e.target.closest('.mode-btn').dataset.mode;
                this.switchMode(mode);
            });
        });

        // Settings events
        this.bindSettingsEvents();

        // Mobile events
        this.bindMobileEvents();

        // File upload events
        this.bindFileUploadEvents();
    }

    bindFileUploadEvents() {
        // General file upload
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', () => this.uploadFile());
        }

        // RAG file upload
        const ragFileInput = document.getElementById('ragFileInput');
        if (ragFileInput) {
            ragFileInput.addEventListener('change', () => this.handleRAGUpload());
        }

        // Code file upload
        const codeFileInput = document.getElementById('codeFileInput');
        if (codeFileInput) {
            codeFileInput.addEventListener('change', () => this.handleCodebaseUpload());
        }

        // GitHub URL input
        const githubBtn = document.getElementById('githubBtn');
        if (githubBtn) {
            githubBtn.addEventListener('click', () => this.handleGitHubUpload());
        }
    }

    bindSettingsEvents() {
        const settingsElements = {
            autoScroll: document.getElementById('autoScrollCheck'),
            sound: document.getElementById('soundCheck'),
            imageGenEnabled: document.getElementById('imageGenCheck'),
            webSearchEnabled: document.getElementById('webSearchCheck'),
            ragEnabled: document.getElementById('ragCheck'),
            codeAnalysisEnabled: document.getElementById('codeAnalysisCheck'),
            streamingEnabled: document.getElementById('streamingCheck')
        };

        Object.entries(settingsElements).forEach(([key, element]) => {
            if (element) {
                element.addEventListener('change', (e) => {
                    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
                    this.updateSetting(key, value);
                });
            }
        });

        // Close modal when clicking outside
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === e.currentTarget) {
                    this.closeSettings();
                }
            });
        }
    }

    bindMobileEvents() {
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeSidebar());
        }
    }

    // Auto-resize textarea
    autoResize(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
    }

    // Handle keyboard shortcuts
    handleKeyDown(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    // Switch between chat modes
    switchMode(mode) {
        console.log('Switching to mode:', mode);
        
        // Check if mode is enabled
        if (!this.isModeEnabled(mode)) {
            this.showNotification(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode is disabled. Enable it in settings.`, 'warning');
            return;
        }

        this.currentMode = mode;
        
        // Update active button
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });

        // Update UI based on mode
        this.updateUIForMode(mode);
        this.updateInputPlaceholder(mode);
        this.updateFileInputs(mode);
        
        console.log('Current mode set to:', this.currentMode);
    }

    isModeEnabled(mode) {
        switch (mode) {
            case 'image':
                return this.settings.imageGenEnabled;
            case 'search':
                return this.settings.webSearchEnabled;
            case 'rag':
                return this.settings.ragEnabled;
            case 'code':
                return this.settings.codeAnalysisEnabled;
            case 'chat':
            default:
                return true;
        }
    }

    updateUIForMode(mode) {
        // Update chat header title
        const chatTitle = document.querySelector('.chat-title h1');
        if (chatTitle) {
            const titles = {
                'chat': '💬 AI Assistant',
                'image': '🎨 Image Generator',
                'search': '🔍 Web Search',
                'rag': '📄 Document Chat',
                'code': '💻 Code Assistant'
            };
            chatTitle.textContent = titles[mode] || 'AI Assistant';
        }

        // Show/hide GitHub input for code mode
        const githubInput = document.getElementById('githubInput');
        if (githubInput) {
            githubInput.style.display = mode === 'code' ? 'flex' : 'none';
        }
    }

    updateInputPlaceholder(mode) {
        const messageInput = document.getElementById('messageInput');
        const placeholders = {
            'chat': '💬 Type your message here...',
            'image': '🎨 Describe the image you want to generate...',
            'search': '🔍 What would you like to search for?',
            'rag': '📄 Ask questions about your uploaded documents...',
            'code': '💻 Ask questions about your uploaded codebase...'
        };
        
        if (messageInput) {
            messageInput.placeholder = placeholders[mode] || placeholders['chat'];
        }
    }

    updateFileInputs(mode) {
        // Hide all file inputs first
        const fileInputs = {
            'generalUpload': document.getElementById('generalUpload'),
            'ragUpload': document.getElementById('ragUpload'),
            'codeUpload': document.getElementById('codeUpload')
        };

        Object.values(fileInputs).forEach(input => {
            if (input) input.style.display = 'none';
        });

        // Show appropriate file input based on mode
        switch (mode) {
            case 'rag':
                if (fileInputs.ragUpload) fileInputs.ragUpload.style.display = 'flex';
                break;
            case 'code':
                if (fileInputs.codeUpload) fileInputs.codeUpload.style.display = 'flex';
                break;
            case 'chat':
            case 'image':
            case 'search':
            default:
                if (fileInputs.generalUpload) fileInputs.generalUpload.style.display = 'flex';
                break;
        }
    }

    updateModeButtons() {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            const mode = btn.dataset.mode;
            const isEnabled = this.isModeEnabled(mode);
            
            btn.disabled = !isEnabled;
            btn.classList.toggle('disabled', !isEnabled);
            
            if (!isEnabled && btn.classList.contains('active')) {
                // Switch to chat mode if current mode is disabled
                this.switchMode('chat');
            }
        });
    }

    // Send message with mode-specific handling
    async sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message || this.isLoading) return;

        // Clear input and reset height
        messageInput.value = '';
        messageInput.style.height = 'auto';
        
        this.isLoading = true;
        this.updateSendButton();

        // Add user message
        this.addMessage('user', message);
        this.showTypingIndicator();

        try {
            switch (this.currentMode) {
                case 'image':
                    if (this.settings.imageGenEnabled) {
                        await this.generateImageFromChat(message);
                    } else {
                        this.addMessage('assistant', 'Image generation is disabled. Please enable it in settings.');
                    }
                    break;
                case 'search':
                    if (this.settings.webSearchEnabled) {
                        await this.performWebSearch(message);
                    } else {
                        this.addMessage('assistant', 'Web search is disabled. Please enable it in settings.');
                    }
                    break;
                case 'rag':
                    if (this.settings.ragEnabled) {
                        await this.chatWithDocuments(message);
                    } else {
                        this.addMessage('assistant', 'RAG is disabled. Please enable it in settings.');
                    }
                    break;
                case 'code':
                    if (this.settings.codeAnalysisEnabled) {
                        await this.chatWithCode(message);
                    } else {
                        this.addMessage('assistant', 'Code analysis is disabled. Please enable it in settings.');
                    }
                    break;
                case 'chat':
                default:
                    await this.sendChatMessage(message);
                    break;
            }
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
        } finally {
            this.hideTypingIndicator();
            this.isLoading = false;
            this.updateSendButton();
        }
    }

    async sendChatMessage(message) {
        try {
            const response = await fetch('/send_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message, stream: this.settings.streamingEnabled })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Check if response supports streaming
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/stream') && this.settings.streamingEnabled) {
                await this.handleStreamingResponse(response);
            } else {
                const data = await response.json();
                if (data.error) {
                    this.addMessage('assistant', 'Sorry, I encountered an error: ' + data.error);
                } else {
                    this.addMessage('assistant', data.ai_response);
                }
            }
        } catch (error) {
            throw error;
        }
    }

    async handleStreamingResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Create streaming message
        const messageId = this.addStreamingMessage('assistant');
        let fullText = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            this.finishStreamingMessage(messageId);
                            return;
                        }
                        
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                fullText += parsed.content;
                                this.updateStreamingMessage(messageId, fullText);
                            }
                        } catch (e) {
                            // Ignore parsing errors for partial chunks
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Streaming error:', error);
            this.finishStreamingMessage(messageId);
            this.addMessage('assistant', 'Sorry, there was an error with the streaming response.');
        }
    }

    async performWebSearch(query) {
        try {
            const response = await fetch('/web_search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query })
            });

            const data = await response.json();

            if (data.error) {
                this.addMessage('assistant', `🔍 Search Error: ${data.error}`);
            } else {
                let searchMessage = `🔍 **Web Search Results for "${data.query}"**\n\n`;
                searchMessage += `Found ${data.search_results.length} results:\n\n`;
                
                data.search_results.forEach((result, index) => {
                    searchMessage += `**${index + 1}. ${result.title}**\n`;
                    searchMessage += `${result.snippet}\n`;
                    searchMessage += `🔗 [${result.link}](${result.link})\n\n`;
                });
                
                searchMessage += `**AI Analysis:**\n${data.ai_response}`;
                this.addMessage('assistant', searchMessage);
            }
        } catch (error) {
            console.error('Web search error:', error);
            this.addMessage('assistant', '🔍 Web search failed. Please check your connection and try again.');
        }
    }

    async generateImageFromChat(prompt) {
        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt })
            });

            const data = await response.json();

            if (data.error) {
                this.addMessage('assistant', `🎨 Image Generation Error: ${data.error}`);
            } else if (data.image_url) {
                this.addMessage('assistant', `🎨 Generated image for: "${prompt}"\n<img src="${data.image_url}" alt="Generated Image" class="generated-image" onclick="openImageModal('${data.image_url}')">`);
            }
        } catch (error) {
            console.error('Image generation error:', error);
            this.addMessage('assistant', '🎨 Image generation failed. Please try again.');
        }
    }

    async chatWithDocuments(message) {
        try {
            const response = await fetch('/chat_with_documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();

            if (data.error) {
                this.addMessage('assistant', `📄 RAG Error: ${data.error}`);
            } else {
                let ragMessage = `📄 **Document Analysis**\n\n`;
                ragMessage += `**Your Question:** ${data.user_message}\n\n`;
                ragMessage += `**Answer from Documents:**\n${data.ai_response}\n\n`;
                ragMessage += `**Sources:** ${data.sources.join(', ')} (${data.relevant_documents} relevant chunks)`;
                this.addMessage('assistant', ragMessage);
            }
        } catch (error) {
            console.error('RAG error:', error);
            this.addMessage('assistant', '📄 Document chat failed. Please upload documents first.');
        }
    }

    async chatWithCode(message) {
        try {
            const response = await fetch('/chat_with_code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();

            if (data.error) {
                this.addMessage('assistant', `💻 Code Analysis Error: ${data.error}`);
            } else {
                let codeMessage = `💻 **Codebase Analysis**\n\n`;
                codeMessage += `**Your Question:** ${data.user_message}\n\n`;
                codeMessage += `**Code Analysis:**\n${data.ai_response}\n\n`;
                codeMessage += `**Relevant Files:** ${data.sources.join(', ')} (${data.relevant_files} files analyzed)`;
                this.addMessage('assistant', codeMessage);
            }
        } catch (error) {
            console.error('Code analysis error:', error);
            this.addMessage('assistant', '💻 Code analysis failed. Please upload a codebase ZIP first.');
        }
    }

    // Add message to chat
    addMessage(role, content) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        
        const now = new Date();
        const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const avatar = role === 'user' ? this.getUserInitial() : 'AI';
        
        // Handle image content
        let messageContent = content;
        if (content.includes('<img')) {
            // Image content is already formatted
        } else if (content.includes('data:image/') || content.includes('/static/generated_images/')) {
            const imageMatch = content.match(/(data:image\/[^"]+|\/static\/generated_images\/[^"]+)/);
            if (imageMatch) {
                const imageUrl = imageMatch[1];
                messageContent = content.replace(imageMatch[0], '');
                messageContent += `<br><img src="${imageUrl}" alt="Generated Image" class="generated-image" onclick="openImageModal('${imageUrl}')">`;
            }
        }
        
        // Handle code blocks
        messageContent = this.formatCodeBlocks(messageContent);
        
        // Handle markdown formatting
        messageContent = this.formatMarkdown(messageContent);
        
        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-text">${messageContent.replace(/\n/g, '<br>')}</div>
                <div class="message-time">${timeString}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        
        if (this.autoScroll) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        return messageDiv;
    }

    formatCodeBlocks(content) {
        // Format code blocks with syntax highlighting
        const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
        return content.replace(codeBlockRegex, (match, language, code) => {
            const lang = language || 'text';
            const codeId = 'code_' + Math.random().toString(36).substr(2, 9);
            const formattedCode = this.formatCodeWithIndentation(code.trim());
            return `
                <div class="code-canvas">
                    <div class="code-header">
                        <span class="code-language">${lang}</span>
                        <button class="copy-code-btn" onclick="copyCode('${codeId}')">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                    <div class="code-content">
                        <pre><code id="${codeId}" class="language-${lang}">${this.escapeHtml(formattedCode)}</code></pre>
                    </div>
                </div>
            `;
        });
    }

    formatCodeWithIndentation(code) {
        // Preserve original indentation and formatting
        const lines = code.split('\n');
        let formattedLines = [];
        
        for (let line of lines) {
            // Preserve leading whitespace
            formattedLines.push(line);
        }
        
        return formattedLines.join('\n');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatMarkdown(content) {
        // Basic markdown formatting
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
        content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        return content;
    }

    addStreamingMessage(role) {
        const messageDiv = this.addMessage(role, '');
        const messageText = messageDiv.querySelector('.message-text');
        messageText.classList.add('streaming-text');
        return messageDiv;
    }

    updateStreamingMessage(messageElement, content) {
        const messageText = messageElement.querySelector('.message-text');
        const formattedContent = this.formatCodeBlocks(this.formatMarkdown(content));
        messageText.innerHTML = formattedContent.replace(/\n/g, '<br>');
        
        if (this.autoScroll) {
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    finishStreamingMessage(messageElement) {
        const messageText = messageElement.querySelector('.message-text');
        messageText.classList.remove('streaming-text');
    }

    getUserInitial() {
        const username = document.querySelector('.user-name')?.textContent || 'U';
        return username.charAt(0).toUpperCase();
    }

    // Typing indicator
    showTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.classList.add('show');
            if (this.autoScroll) {
                const chatMessages = document.getElementById('chat-messages');
                chatMessages.scrollTop = chatMessages.scrollHeight;
            }
        }
    }

    hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.classList.remove('show');
        }
    }

    // Update send button state
    updateSendButton() {
        const sendBtn = document.getElementById('sendBtn');
        if (sendBtn) {
            sendBtn.disabled = this.isLoading;
            sendBtn.innerHTML = this.isLoading ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-paper-plane"></i>';
        }
    }

    // File upload for general chat
    async uploadFile() {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];
        
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        this.addMessage('user', `📎 Uploading: ${file.name}`);
        this.showTypingIndicator();

        try {
            const response = await fetch('/upload_file', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.error) {
                this.addMessage('assistant', 'Upload failed: ' + data.error);
            } else {
                let message = data.message;
                
                if (data.type === 'document') {
                    message += ` (${data.chunks} chunks processed)`;
                } else if (data.type === 'image') {
                    message += `\n\nImage Analysis: ${data.description}`;
                }
                
                this.addMessage('assistant', message);
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.addMessage('assistant', 'File upload failed. Please try again.');
        } finally {
            this.hideTypingIndicator();
            fileInput.value = '';
        }
    }

    // Handle RAG file upload
    async handleRAGUpload() {
        const fileInput = document.getElementById('ragFileInput');
        const file = fileInput.files[0];
        
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        this.addMessage('user', `📄 Uploading document: ${file.name}`);
        this.showTypingIndicator();

        try {
            const response = await fetch('/upload_document', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.error) {
                this.addMessage('assistant', `📄 Upload failed: ${data.error}`);
            } else {
                this.addMessage('assistant', `📄 ${data.message}\n\nProcessed ${data.chunks} chunks from "${data.filename}". You can now ask questions about this document!`);
            }
        } catch (error) {
            console.error('RAG upload error:', error);
            this.addMessage('assistant', '📄 Document upload failed. Please try again.');
        } finally {
            this.hideTypingIndicator();
            fileInput.value = '';
        }
    }

    // Handle codebase upload
    async handleCodebaseUpload() {
        const fileInput = document.getElementById('codeFileInput');
        const file = fileInput.files[0];
        
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        this.addMessage('user', `💻 Uploading codebase: ${file.name}`);
        this.showTypingIndicator();

        try {
            const response = await fetch('/upload_codebase', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.error) {
                this.addMessage('assistant', `💻 Upload failed: ${data.error}`);
            } else {
                this.addMessage('assistant', `💻 ${data.message}\n\nProcessed ${data.chunks} code chunks from "${data.filename}". You can now ask questions about your codebase!`);
            }
        } catch (error) {
            console.error('Codebase upload error:', error);
            this.addMessage('assistant', '💻 Codebase upload failed. Please try again.');
        } finally {
            this.hideTypingIndicator();
            fileInput.value = '';
        }
    }

    // Handle GitHub repository upload
    async handleGitHubUpload() {
        const githubUrlInput = document.getElementById('githubUrlInput');
        const githubUrl = githubUrlInput.value.trim();
        
        if (!githubUrl) {
            alert('Please enter a GitHub repository URL');
            return;
        }

        this.addMessage('user', `💻 Processing GitHub repository: ${githubUrl}`);
        this.showTypingIndicator();

        try {
            const response = await fetch('/upload_github', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ github_url: githubUrl })
            });

            const data = await response.json();

            if (data.error) {
                this.addMessage('assistant', `💻 GitHub upload failed: ${data.error}`);
            } else {
                this.addMessage('assistant', `💻 ${data.message}\n\nProcessed ${data.chunks} code chunks from "${data.repo_name}". You can now ask questions about this codebase!`);
                githubUrlInput.value = '';
            }
        } catch (error) {
            console.error('GitHub upload error:', error);
            this.addMessage('assistant', '💻 GitHub repository processing failed. Please try again.');
        } finally {
            this.hideTypingIndicator();
        }
    }

    // Navigation functions
    newChat() {
        fetch('/new_session')
            .then(response => response.json())
            .then(data => {
                if (data.session_id) {
                    this.clearChatMessages();
                    this.addMessage('assistant', 'Hello! I\'m your AI assistant. How can I help you today?');
                }
            })
            .catch(error => console.error('Error creating new session:', error));
    }

    clearChat() {
        if (confirm('Are you sure you want to clear this chat?')) {
            this.clearChatMessages();
            this.addMessage('assistant', 'Chat cleared. How can I help you today?');
        }
    }

    clearChatMessages() {
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = `
                <div class="typing-indicator" id="typing-indicator">
                    <div class="message-avatar">AI</div>
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            `;
        }
    }

    // Settings
    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('show');
        }
    }

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    updateSetting(key, value) {
        localStorage.setItem(key, value);
        this.settings[key] = value;
        
        switch (key) {
            case 'autoScroll':
                this.autoScroll = value;
                break;
            case 'imageGenEnabled':
            case 'webSearchEnabled':
            case 'ragEnabled':
            case 'codeAnalysisEnabled':
                this.updateModeButtons();
                break;
            case 'streamingEnabled':
                // Update streaming preference
                break;
        }
    }

    loadSettings() {
        const defaultSettings = {
            autoScroll: true,
            sound: false,
            imageGenEnabled: false,
            webSearchEnabled: true,
            ragEnabled: true,
            codeAnalysisEnabled: true,
            streamingEnabled: true
        };

        // Load settings from localStorage
        Object.keys(defaultSettings).forEach(key => {
            const saved = localStorage.getItem(key);
            if (saved !== null) {
                this.settings[key] = saved === 'true';
            } else {
                this.settings[key] = defaultSettings[key];
            }
        });

        this.autoScroll = this.settings.autoScroll;

        // Update UI
        const elements = {
            autoScrollCheck: document.getElementById('autoScrollCheck'),
            soundCheck: document.getElementById('soundCheck'),
            imageGenCheck: document.getElementById('imageGenCheck'),
            webSearchCheck: document.getElementById('webSearchCheck'),
            ragCheck: document.getElementById('ragCheck'),
            codeAnalysisCheck: document.getElementById('codeAnalysisCheck'),
            streamingCheck: document.getElementById('streamingCheck')
        };

        Object.entries(elements).forEach(([key, element]) => {
            if (element) {
                const settingKey = key.replace('Check', 'Enabled').replace('autoScrollEnabled', 'autoScroll').replace('soundEnabled', 'sound');
                if (element.type === 'checkbox') {
                    element.checked = this.settings[settingKey];
                } else {
                    element.value = this.settings[settingKey];
                }
            }
        });
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            ${message}
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Mobile functions
    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (sidebar) sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('show');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        if (sidebar) sidebar.classList.remove('open');
        if (overlay) overlay.classList.remove('show');
    }

    focusInput() {
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.focus();
        }
    }

    // Utility functions
    logout() {
        if (confirm('Are you sure you want to logout?')) {
            window.location.href = '/logout';
        }
    }
}

// Global functions for HTML onclick handlers
function openImageModal(imageSrc) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    if (modal && modalImage) {
        modalImage.src = imageSrc;
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }
}

function copyCode(codeId) {
    const codeBlock = document.getElementById(codeId);
    const text = codeBlock.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const button = document.querySelector(`button[onclick="copyCode('${codeId}')"]`);
        if (button) {
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i> Copied!';
            button.style.background = '#28a745';
            
            setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = '#007acc';
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy code:', err);
        alert('Failed to copy code to clipboard');
    });
}

// Initialize chat interface when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.chatInterface = new ChatInterface();
    
    // Global function bindings for HTML onclick handlers
    window.newChat = () => window.chatInterface.newChat();
    window.clearChat = () => window.chatInterface.clearChat();
    window.openSettings = () => window.chatInterface.openSettings();
    window.closeSettings = () => window.chatInterface.closeSettings();
    window.toggleSidebar = () => window.chatInterface.toggleSidebar();
    window.closeSidebar = () => window.chatInterface.closeSidebar();
    window.logout = () => window.chatInterface.logout();
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
            window.chatInterface.closeSettings();
        }
    });
    
    // Close image modal when clicking outside
    const imageModal = document.getElementById('imageModal');
    if (imageModal) {
        imageModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeImageModal();
            }
        });
    }
});