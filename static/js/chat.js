class ChatInterface {
    constructor() {
        this.isLoading = false;
        this.autoScroll = true;
        this.currentMode = 'chat';
        this.streamingMessage = null;
        this.settings = {
            imageGenEnabled: false,
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
    }

    bindEvents() {
        // Message input events
        const messageInput = document.getElementById('messageInput');
        messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));
        messageInput.addEventListener('input', (e) => this.autoResize(e.target));

        // Button events
        document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('fileInput').addEventListener('change', () => this.uploadFile());

        // Mode selector events
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });

        // Settings events
        this.bindSettingsEvents();

        // Mobile events
        this.bindMobileEvents();

        // Image generation events
        this.bindImageGenEvents();
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
        document.getElementById('settingsModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeSettings();
            }
        });
    }

    bindMobileEvents() {
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.closeSidebar());
        }
    }

    bindImageGenEvents() {
        const generateBtn = document.getElementById('generateBtn');
        const promptTextarea = document.getElementById('imagePromptInput');
        
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateImage());
        }

        if (promptTextarea) {
            promptTextarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                    this.generateImage();
                }
            });
        }

        // Example prompts
        document.querySelectorAll('.example-prompt').forEach(prompt => {
            prompt.addEventListener('click', (e) => {
                this.setImagePrompt(e.target.textContent.trim());
            });
        });

        // Close panel
        const closePanelBtn = document.getElementById('closePanelBtn');
        if (closePanelBtn) {
            closePanelBtn.addEventListener('click', () => this.closeImageGenPanel());
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
        // Check if mode is enabled
        if (!this.isModeEnabled(mode)) {
            this.showNotification(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode is disabled. Enable it in settings.`, 'warning');
            return;
        }

        this.currentMode = mode;
        
        // Update active button
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === mode);
        });

        // Update UI based on mode
        this.updateUIForMode(mode);
        this.updateInputPlaceholder(mode);
        this.updateFileInputs(mode);
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
        // Close image panel if not in image mode
        if (mode !== 'image') {
            this.closeImageGenPanel();
        }
        
        // Show image panel if in image mode
        if (mode === 'image') {
            this.openImageGenPanel();
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
            'fileInput': document.querySelector('.file-upload'),
            'ragFileInput': document.getElementById('ragUpload'),
            'codeFileInput': document.getElementById('codeUpload')
        };

        Object.values(fileInputs).forEach(input => {
            if (input) input.style.display = 'none';
        });

        // Show appropriate file input based on mode
        switch (mode) {
            case 'rag':
                if (fileInputs.ragFileInput) fileInputs.ragFileInput.style.display = 'block';
                break;
            case 'code':
                if (fileInputs.codeFileInput) fileInputs.codeFileInput.style.display = 'block';
                break;
            case 'chat':
            default:
                if (fileInputs.fileInput) fileInputs.fileInput.style.display = 'block';
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

    // Send message with streaming support
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
            if (this.currentMode === 'image' && this.settings.imageGenEnabled) {
                await this.generateImageFromChat(message);
            } else if (this.currentMode === 'search' && this.settings.webSearchEnabled) {
                await this.performWebSearch(message);
            } else if (this.currentMode === 'rag' && this.settings.ragEnabled) {
                await this.chatWithDocuments(message);
            } else if (this.currentMode === 'code' && this.settings.codeAnalysisEnabled) {
                await this.chatWithCode(message);
            } else {
                await this.sendChatMessage(message);
            }
        } catch (error) {
            console.error('Error:', error);
            this.addMessage('assistant', 'Sorry, I encountered a network error. Please try again.');
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
                body: JSON.stringify({ message: message, stream: true })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Check if response supports streaming
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/stream')) {
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
        if (content.includes('data:image/') || content.includes('/static/generated_images/')) {
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
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        return content.replace(codeBlockRegex, (match, language, code) => {
            const lang = language || 'text';
            const codeId = 'code_' + Math.random().toString(36).substr(2, 9);
            return `
                <div class="code-canvas">
                    <div class="code-header">
                        <span class="code-language">${lang}</span>
                        <button class="copy-code-btn" onclick="copyCode(this)">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                    <div class="code-content">
                        <code id="${codeId}">${code.trim()}</code>
                    </div>
                </div>
            `;
        });
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
        messageText.innerHTML = content.replace(/\n/g, '<br>');
        
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
        document.getElementById('typing-indicator').classList.add('show');
        if (this.autoScroll) {
            const chatMessages = document.getElementById('chat-messages');
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    hideTypingIndicator() {
        document.getElementById('typing-indicator').classList.remove('show');
    }

    // Update send button state
    updateSendButton() {
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = this.isLoading;
        sendBtn.innerHTML = this.isLoading ? '<i class="fas fa-spinner fa-spin"></i>' : '<i class="fas fa-paper-plane"></i>';
    }

    // File upload
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

    // Image Generation
    openImageGenPanel() {
        document.getElementById('imageGenPanel').classList.add('show');
    }

    closeImageGenPanel() {
        document.getElementById('imageGenPanel').classList.remove('show');
        // Reset mode to chat
        this.switchMode('chat');
    }

    setImagePrompt(text) {
        const promptInput = document.getElementById('imagePromptInput');
        if (promptInput) {
            promptInput.value = text;
            promptInput.focus();
        }
    }

    async generateImage() {
        const promptInput = document.getElementById('imagePromptInput');
        const prompt = promptInput.value.trim();

        if (!prompt) {
            alert('Please enter a prompt to generate an image');
            return;
        }

        const generateBtn = document.getElementById('generateBtn');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

        try {
            const response = await fetch('/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            if (data.image_url) {
                // Add to chat
                this.addMessage('assistant', `🎨 Generated image for: "${prompt}"\n${data.image_url}`);
                
                // Add to image panel
                this.addImageToPanel(data.image_url, prompt);
                
                // Clear prompt
                promptInput.value = '';
            } else {
                throw new Error(data.error || 'Failed to generate image');
            }

        } catch (error) {
            console.error('Generation error:', error);
            alert(`Failed to generate image: ${error.message}`);
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate Image';
        }
    }

    addImageToPanel(imageUrl, prompt) {
        const imagesContainer = document.getElementById('generatedImages');
        if (!imagesContainer) return;

        const imageCard = document.createElement('div');
        imageCard.className = 'image-card';
        
        imageCard.innerHTML = `
            <img src="${imageUrl}" alt="Generated Image" onclick="openImageModal('${imageUrl}')">
            <div class="image-card-info">
                <div class="image-prompt">${prompt}</div>
                <div class="image-actions">
                    <button class="image-action" onclick="openImageModal('${imageUrl}')">
                        <i class="fas fa-expand"></i> View
                    </button>
                    <a href="${imageUrl}" download="generated-image.png" class="image-action">
                        <i class="fas fa-download"></i> Download
                    </a>
                </div>
            </div>
        `;
        
        imagesContainer.insertBefore(imageCard, imagesContainer.firstChild);
    }

    // RAG Document Upload
    uploadRAGDocument() {
        document.getElementById('ragFileInput').click();
    }

    // Codebase Upload
    uploadCodebase() {
        document.getElementById('codeFileInput').click();
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

    // Settings
    openSettings() {
        document.getElementById('settingsModal').classList.add('show');
    }

    closeSettings() {
        document.getElementById('settingsModal').classList.remove('show');
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
        
        sidebar.classList.toggle('open');
        overlay.classList.toggle('show');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        
        sidebar.classList.remove('open');
        overlay.classList.remove('show');
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
    document.getElementById('modalImage').src = imageSrc;
    document.getElementById('imageModal').classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    document.getElementById('imageModal').classList.remove('show');
    document.body.style.overflow = 'auto';
}

function copyCode(button) {
    const codeBlock = button.closest('.code-canvas').querySelector('.code-content code');
    const text = codeBlock.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.style.background = '#28a745';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '#007acc';
        }, 2000);
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
    
    // File upload event listeners
    document.getElementById('ragFileInput').addEventListener('change', () => {
        window.chatInterface.handleRAGUpload();
    });
    
    document.getElementById('codeFileInput').addEventListener('change', () => {
        window.chatInterface.handleCodebaseUpload();
    });
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
            window.chatInterface.closeSettings();
            window.chatInterface.closeImageGenPanel();
        }
    });
    
    // Close image modal when clicking outside
    document.getElementById('imageModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeImageModal();
        }
    });
});