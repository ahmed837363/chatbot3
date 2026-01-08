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
        // Local ALLaM AI via Cloudflare Tunnel (permanent URL)
        aiWorkerUrl: 'https://allam-ai.mayasahstyle.me/v1/chat/completions',
        aiModel: 'allam-7b-instruct-preview',
        chatbotColor: '#667eea',
        position: 'bottom-left', // or 'bottom-right'
        welcomeMessage: 'هلا والله! كيف أقدر أساعدك اليوم؟ 😊',
        placeholder: 'اكتب رسالتك...',
        language: 'ar' // Arabic
    };

    // Get store ID and custom config from script tag
    const scriptTag = document.currentScript;
    const storeId = scriptTag?.getAttribute('data-store-id') || 'demo';
    const customWorkerUrl = scriptTag?.getAttribute('data-ai-url');
    if (customWorkerUrl) config.aiWorkerUrl = customWorkerUrl;

    // Conversation history for context
    let conversationHistory = [];
    
    // Store data (products, shipping, etc.) - will be loaded from Salla API
    let storeData = {
        storeName: 'متجر',
        products: [],
        shipping: [],
        coupons: [],
        offers: [],
        loaded: false
    };

    // Fetch store data from Salla API (when access token is available)
    async function loadStoreData() {
        try {
            // Get store data from Appwrite (cached by webhook - no CORS issues!)
            const storeDoc = await fetchStoreFromAppwrite(storeId);
            
            if (storeDoc) {
                storeData.storeName = storeDoc.storeName || 'متجر';
                
                // Parse cached data from Appwrite
                try {
                    storeData.products = storeDoc.cachedProducts ? JSON.parse(storeDoc.cachedProducts) : [];
                } catch (e) { storeData.products = []; }
                
                try {
                    storeData.shipping = storeDoc.cachedShipping ? JSON.parse(storeDoc.cachedShipping) : [];
                } catch (e) { storeData.shipping = []; }
                
                try {
                    storeData.coupons = storeDoc.cachedCoupons ? JSON.parse(storeDoc.cachedCoupons) : [];
                } catch (e) { storeData.coupons = []; }
                
                try {
                    storeData.offers = storeDoc.cachedOffers ? JSON.parse(storeDoc.cachedOffers) : [];
                } catch (e) { storeData.offers = []; }
                
                storeData.loaded = true;
                
                console.log('✅ Store data loaded from cache:');
                console.log('   - Store:', storeData.storeName);
                console.log('   - Products:', storeData.products.length);
                console.log('   - Shipping zones:', storeData.shipping.length);
                console.log('   - Coupons:', storeData.coupons.length);
                console.log('   - Offers:', storeData.offers.length);
                console.log('   - Last updated:', storeDoc.cacheLastUpdated || 'Unknown');
            }
        } catch (error) {
            console.log('ℹ️ Using demo mode - no store data loaded:', error.message);
        }
    }

    async function fetchStoreFromAppwrite(storeId) {
        try {
            const response = await fetch(
                `${config.appwriteEndpoint}/databases/${config.databaseId}/collections/${config.collectionId}/documents?queries[]=equal("merchantId",${storeId})`,
                { headers: { 'X-Appwrite-Project': config.appwriteProjectId } }
            );
            const data = await response.json();
            return data.documents?.[0];
        } catch (e) {
            return null;
        }
    }

    // Build dynamic system prompt with real store data
    function buildSystemPrompt() {
        // Products section
        let productList = '';
        if (storeData.products.length > 0) {
            productList = storeData.products.slice(0, 30).map((p, i) => {
                let priceText = `${p.price} ${p.currency || 'ريال'}`;
                if (p.salePrice && p.salePrice < p.price) {
                    priceText = `${p.salePrice} ريال (بدل ${p.price})`;
                }
                const stockStatus = p.inStock !== false ? '✓' : '(نفذ)';
                return `${i+1}. ${p.name} - ${priceText} ${stockStatus}`;
            }).join('\n');
        } else {
            productList = `(منتجات تجريبية)
1. ساعة سامسونج Galaxy Watch 6 - 1,299 ريال
2. سماعات آبل AirPods Pro 2 - 899 ريال
3. عطر مسك الطهارة (100مل) - 149 ريال
4. طقم قهوة عربية نحاس - 350 ريال
5. شماغ شتوي فاخر - 189 ريال
6. تمر سكري القصيم (3 كيلو) - 120 ريال`;
        }

        // Shipping section
        let shippingInfo = '';
        if (storeData.shipping.length > 0) {
            shippingInfo = storeData.shipping.map(s => {
                let text = `- ${s.name}`;
                if (s.methods && s.methods.length > 0) {
                    text += ': ' + s.methods.map(m => `${m.name} (${m.cost} ريال)`).join(', ');
                }
                if (s.countries && s.countries.length > 0) {
                    text += ` [${s.countries.join(', ')}]`;
                }
                return text;
            }).join('\n');
        } else {
            shippingInfo = `- داخل السعودية: 25 ريال (مجاني فوق 200 ريال) - 2-5 أيام`;
        }

        // Coupons section
        let couponsInfo = '';
        if (storeData.coupons.length > 0) {
            couponsInfo = storeData.coupons.map(c => {
                const discountText = c.type === 'percentage' ? `خصم ${c.discount}%` : `خصم ${c.discount} ريال`;
                return `- كود "${c.code}": ${discountText}`;
            }).join('\n');
        } else {
            couponsInfo = '- لا يوجد كوبونات نشطة حالياً';
        }

        // Offers section
        let offersInfo = '';
        if (storeData.offers.length > 0) {
            offersInfo = storeData.offers.map(o => {
                let text = `- ${o.name}`;
                if (o.discount) text += ` (خصم ${o.discount}%)`;
                return text;
            }).join('\n');
        } else {
            offersInfo = '- لا يوجد عروض خاصة حالياً';
        }

        return `أنت علام، مساعد ذكي لـ "${storeData.storeName}". تتحدث باللهجة السعودية.

═══════════════════════════════════
📦 المنتجات المتوفرة:
═══════════════════════════════════
${productList}

═══════════════════════════════════
🚚 الشحن والتوصيل:
═══════════════════════════════════
${shippingInfo}

═══════════════════════════════════
🏷️ كوبونات الخصم النشطة:
═══════════════════════════════════
${couponsInfo}

═══════════════════════════════════
🎉 العروض الخاصة:
═══════════════════════════════════
${offersInfo}

═══════════════════════════════════
💳 طرق الدفع: مدى، فيزا، ماستركارد، أبل باي، تابي
🔄 الاسترجاع: خلال 14 يوم من الاستلام

═══════════════════════════════════
قواعد الرد:
═══════════════════════════════════
- استخدم اللهجة السعودية (وش، الحين، تمام، يعطيك العافية)
- كن مختصر وودود
- إذا سأل عن منتج موجود، أعطه السعر
- إذا فيه كوبون مناسب، اقترحه على العميل
- إذا سأل عن منتج مو موجود، قول "للأسف ما عندنا هذا المنتج"
- لا تخترع منتجات أو أسعار أو كوبونات غير موجودة في القوائم أعلاه`;
    }

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

        // Load store data from Salla API (if available)
        loadStoreData();

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
        conversationHistory.push({ role: 'user', content: message });
        input.value = '';

        // Show typing indicator
        showTypingIndicator();

        // Call AI API
        callAI(message)
            .then(response => {
                hideTypingIndicator();
                addMessage(response, 'bot');
                conversationHistory.push({ role: 'assistant', content: response });
            })
            .catch(error => {
                hideTypingIndicator();
                console.error('AI Error:', error);
                // Fallback response
                const fallback = 'عذراً، حصل خطأ. جرب مرة ثانية أو تواصل مع الدعم 📞';
                addMessage(fallback, 'bot');
            });
    }

    async function callAI(message) {
        // Use dynamic system prompt with real or demo store data
        const systemPrompt = buildSystemPrompt();

        try {
            // Send to LM Studio (OpenAI format) via ngrok tunnel
            const response = await fetch(config.aiWorkerUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true' // Skip ngrok warning page
                },
                body: JSON.stringify({
                    model: config.aiModel || 'allam-7b-instruct-preview',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...conversationHistory.slice(-10),
                        { role: 'user', content: message }
                    ],
                    max_tokens: 300,
                    temperature: 0.3,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error('API request failed: ' + response.status);
            }

            const data = await response.json();
            // LM Studio returns OpenAI format
            return data.choices?.[0]?.message?.content || 'ما قدرت أفهم، جرب مرة ثانية';
        } catch (error) {
            console.error('AI API Error:', error);
            return getLocalFallback(message);
        }
    }

    function getLocalFallback(message) {
        const lower = message.toLowerCase();
        
        if (lower.includes('هلا') || lower.includes('السلام') || lower.includes('مرحبا')) {
            return 'هلا والله! وش أقدر أساعدك فيه؟ 😊';
        }
        if (lower.includes('سعر') || lower.includes('كم') || lower.includes('بكم')) {
            return 'أبشر! قول لي اسم المنتج وأعطيك السعر 🏷️';
        }
        if (lower.includes('شحن') || lower.includes('توصيل')) {
            return 'الشحن يوصل خلال ٢-٥ أيام عادة 🚚';
        }
        if (lower.includes('شكر') || lower.includes('مشكور')) {
            return 'العفو! يسعدني أخدمك 😊';
        }
        
        return 'أبشر! وش تبي تعرف بالضبط؟';
    }

    function showTypingIndicator() {
        const messagesDiv = document.getElementById('chat-messages');
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.style.cssText = `
            margin-bottom: 15px;
            padding: 12px 16px;
            border-radius: 12px;
            background: #e9ecef;
            max-width: 80%;
            margin-left: auto;
            display: flex;
            gap: 4px;
        `;
        typingDiv.innerHTML = `
            <span style="animation: bounce 1s infinite; animation-delay: 0s;">●</span>
            <span style="animation: bounce 1s infinite; animation-delay: 0.2s;">●</span>
            <span style="animation: bounce 1s infinite; animation-delay: 0.4s;">●</span>
            <style>
                @keyframes bounce {
                    0%, 60%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-4px); }
                }
            </style>
        `;
        messagesDiv.appendChild(typingDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function hideTypingIndicator() {
        const typingDiv = document.getElementById('typing-indicator');
        if (typingDiv) typingDiv.remove();
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
