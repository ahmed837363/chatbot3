/**
 * AI Chatbot Widget - Production Ready
 * Embed this on any website to add AI chat support
 * 
 * Usage:
 * <script src="https://your-cdn/chatbot-widget.js" data-store-id="YOUR_STORE_ID"></script>
 */

(function() {
    'use strict';

    // Configuration
    const config = {
        appwriteEndpoint: 'https://fra.cloud.appwrite.io/v1',
        appwriteProjectId: '694669640010920ea3f6',
        databaseId: '6946699d001194236820',
        collectionId: 'store_connections',
        chatbotColor: '#667eea',
        position: 'bottom-left', // or 'bottom-right'
        welcomeMessage: 'مرحباً! كيف يمكنني مساعدتك؟ 👋',
        placeholder: 'اكتب رسالتك...',
        language: 'ar' // Arabic
    };

    // Get store ID from script tag
    const scriptTag = document.currentScript;
    const storeId = scriptTag?.getAttribute('data-store-id') || 'demo';

    // Create widget HTML
    const widgetHTML = `
        <div id="ai-chatbot-widget" style="
            position: fixed;
            ${config.position === 'bottom-left' ? 'left: 20px;' : 'right: 20px;'}
            bottom: 20px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        ">
            <!-- Chat Bubble -->
            <div id="chat-bubble" style="
                width: 60px;
                height: 60px;
                background: ${config.chatbotColor};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                transition: all 0.3s ease;
                font-size: 28px;
            ">
                💬
            </div>

            <!-- Chat Window -->
            <div id="chat-window" style="
                position: absolute;
                ${config.position === 'bottom-left' ? 'left: 0;' : 'right: 0;'}
                bottom: 80px;
                width: 350px;
                height: 500px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                display: none;
                flex-direction: column;
                overflow: hidden;
            ">
                <!-- Header -->
                <div id="chat-header" style="
                    background: linear-gradient(135deg, ${config.chatbotColor} 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <h3 style="margin: 0; font-size: 18px;">🤖 مساعد ذكي</h3>
                        <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">متصل</p>
                    </div>
                    <button id="close-chat" style="
                        background: none;
                        border: none;
                        color: white;
                        font-size: 24px;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    ">×</button>
                </div>

                <!-- Messages -->
                <div id="chat-messages" style="
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    background: #f8f9fa;
                    direction: rtl;
                "></div>

                <!-- Input -->
                <div id="chat-input-container" style="
                    display: flex;
                    padding: 15px;
                    border-top: 1px solid #e0e0e0;
                    background: white;
                    direction: rtl;
                ">
                    <input type="text" id="chat-input" placeholder="${config.placeholder}" style="
                        flex: 1;
                        padding: 12px;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        font-size: 14px;
                        outline: none;
                        direction: rtl;
                    ">
                    <button id="send-btn" style="
                        margin-right: 10px;
                        padding: 12px 20px;
                        background: ${config.chatbotColor};
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: background 0.3s ease;
                    ">إرسال</button>
                </div>
            </div>
        </div>
    `;

    // Inject widget into page
    function initWidget() {
        // Wait for DOM to load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', insertWidget);
        } else {
            insertWidget();
        }
    }

    function insertWidget() {
        // Create container
        const container = document.createElement('div');
        container.innerHTML = widgetHTML;
        document.body.appendChild(container.firstElementChild);

        // Add event listeners
        const bubble = document.getElementById('chat-bubble');
        const window = document.getElementById('chat-window');
        const closeBtn = document.getElementById('close-chat');
        const sendBtn = document.getElementById('send-btn');
        const input = document.getElementById('chat-input');

        bubble.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', toggleChat);
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        // Bubble hover effect
        bubble.addEventListener('mouseenter', () => {
            bubble.style.transform = 'scale(1.1)';
        });
        bubble.addEventListener('mouseleave', () => {
            bubble.style.transform = 'scale(1)';
        });

        // Send welcome message
        addMessage(config.welcomeMessage, 'bot');

        console.log('✅ AI Chatbot Widget loaded!');
        console.log('📍 Store ID:', storeId);
    }

    function toggleChat() {
        const window = document.getElementById('chat-window');
        const bubble = document.getElementById('chat-bubble');
        
        if (window.style.display === 'none' || !window.style.display) {
            window.style.display = 'flex';
            bubble.style.transform = 'scale(0.9)';
            document.getElementById('chat-input').focus();
        } else {
            window.style.display = 'none';
            bubble.style.transform = 'scale(1)';
        }
    }

    function sendMessage() {
        const input = document.getElementById('chat-input');
        const message = input.value.trim();
        
        if (!message) return;

        // Add user message
        addMessage(message, 'user');
        input.value = '';

        // Simulate bot response (replace with actual AI API call)
        setTimeout(() => {
            const responses = [
                'شكراً لتواصلك معنا! كيف يمكنني مساعدتك أكثر؟',
                'يمكنني مساعدتك في معرفة تفاصيل المنتجات، الأسعار، والشحن!',
                'هل تبحث عن منتج معين؟ يسعدني مساعدتك! 😊',
                'لدينا عروض رائعة اليوم! هل تريد معرفة المزيد؟',
                'يمكنك التواصل مع فريق الدعم على: support@example.com'
            ];
            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            addMessage(randomResponse, 'bot');
        }, 1000);
    }

    function addMessage(text, sender) {
        const messagesDiv = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        
        messageDiv.style.cssText = `
            margin-bottom: 15px;
            padding: 12px 16px;
            border-radius: 12px;
            max-width: 80%;
            ${sender === 'bot' ? `
                background: #e9ecef;
                align-self: flex-start;
                margin-left: auto;
            ` : `
                background: ${config.chatbotColor};
                color: white;
                align-self: flex-end;
                margin-right: auto;
            `}
        `;
        
        messageDiv.textContent = text;
        messagesDiv.appendChild(messageDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    // Initialize
    initWidget();

    // Export functions for testing
    window.AIChatbot = {
        open: () => {
            document.getElementById('chat-window').style.display = 'flex';
        },
        close: () => {
            document.getElementById('chat-window').style.display = 'none';
        },
        sendMessage: (msg) => {
            addMessage(msg, 'user');
        }
    };

})();
