/**
 * AI Chatbot Widget - Production Ready
 * Embed this on any website to add AI chat support
 * Supports: Arabic (Saudi dialect) and English
 * 
 * Usage:
 * <script src="https://your-cdn/chatbot-widget.js" data-store-id="YOUR_STORE_ID" data-lang="ar"></script>
 */

(function() {
    'use strict';

    // Bilingual text configuration
    const texts = {
        ar: {
            welcome: 'هلا والله! كيف أقدر أساعدك اليوم؟ 😊',
            placeholder: 'اكتب رسالتك...',
            send: 'إرسال',
            assistant: '🤖 مساعد ذكي',
            connected: 'متصل',
            error: 'عذراً، حصل خطأ. جرب مرة ثانية 📞',
            greeting: 'هلا والله! وش أقدر أساعدك فيه؟ 😊',
            askPrice: 'أبشر! قول لي اسم المنتج وأعطيك السعر 🏷️',
            shipping: 'الشحن يوصل خلال ٢-٥ أيام عادة 🚚',
            thanks: 'العفو! يسعدني أخدمك 😊',
            askMore: 'أبشر! وش تبي تعرف بالضبط؟',
            notUnderstood: 'ما قدرت أفهم، جرب مرة ثانية'
        },
        en: {
            welcome: 'Hello! How can I help you today? 😊',
            placeholder: 'Type your message...',
            send: 'Send',
            assistant: '🤖 AI Assistant',
            connected: 'Online',
            error: 'Sorry, an error occurred. Please try again 📞',
            greeting: 'Hello! How can I help you? 😊',
            askPrice: 'Sure! Tell me the product name and I\'ll give you the price 🏷️',
            shipping: 'Shipping takes 2-5 days usually 🚚',
            thanks: 'You\'re welcome! Happy to help 😊',
            askMore: 'Sure! What would you like to know?',
            notUnderstood: 'I didn\'t understand, please try again'
        }
    };

    // Detect language from script tag or browser
    const scriptTag = document.currentScript;
    const detectedLang = scriptTag?.getAttribute('data-lang') || 
                         (navigator.language?.startsWith('ar') ? 'ar' : 'en');
    let currentLang = ['ar', 'en'].includes(detectedLang) ? detectedLang : 'ar';
    let t = texts[currentLang]; // Current language texts
    let isRTL = currentLang === 'ar';

    // Function to switch language
    function switchLanguage() {
        currentLang = currentLang === 'ar' ? 'en' : 'ar';
        t = texts[currentLang];
        isRTL = currentLang === 'ar';
        updateWidgetLanguage();
        console.log('🌐 Language switched to:', currentLang);
    }

    // Update widget UI for new language
    function updateWidgetLanguage() {
        const header = document.querySelector('#chat-header h3');
        const status = document.querySelector('#chat-header p');
        const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const messagesDiv = document.getElementById('chat-messages');
        const inputContainer = document.getElementById('chat-input-container');
        const langBtn = document.getElementById('lang-switch-btn');
        
        if (header) header.textContent = t.assistant;
        if (status) status.textContent = t.connected;
        if (input) {
            input.placeholder = t.placeholder;
            input.style.direction = isRTL ? 'rtl' : 'ltr';
        }
        if (sendBtn) {
            sendBtn.textContent = t.send;
            sendBtn.style.marginRight = isRTL ? '10px' : '0';
            sendBtn.style.marginLeft = isRTL ? '0' : '10px';
        }
        if (messagesDiv) messagesDiv.style.direction = isRTL ? 'rtl' : 'ltr';
        if (inputContainer) inputContainer.style.direction = isRTL ? 'rtl' : 'ltr';
        if (langBtn) langBtn.textContent = currentLang === 'ar' ? 'EN' : 'عربي';
    }

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
        language: currentLang
    };

    // Get store ID and custom config from script tag
    const storeId = scriptTag?.getAttribute('data-store-id') || 'demo';
    const customWorkerUrl = scriptTag?.getAttribute('data-ai-url');
    const supportContact = scriptTag?.getAttribute('data-support') || '';
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
        supportContact: supportContact, // Support phone/email from website
        loaded: false
    };

    // Scrape products directly from the current page
    function scrapeProductsFromPage() {
        const products = [];
        
        // Method 1: Try Salla's Twilight SDK (best method!)
        if (window.salla && window.salla.product) {
            console.log('🔍 Using Salla Twilight SDK');
            // Products are already loaded by Salla - check for product cards
        }
        
        // Method 2: Look for Salla's product data in the DOM
        const sallaProducts = document.querySelectorAll('.s-product-card-entry, .product-entry, [class*="product-card"]');
        console.log('🔍 Found', sallaProducts.length, 'Salla product elements');
        
        if (sallaProducts.length > 0) {
            sallaProducts.forEach((el, i) => {
                if (i >= 50) return;
                
                // Get product name from various possible locations
                let name = el.querySelector('.s-product-card-entry__title a')?.textContent?.trim() ||
                           el.querySelector('[class*="title"] a')?.textContent?.trim() ||
                           el.querySelector('h3 a, h4 a, h5 a')?.textContent?.trim() ||
                           el.querySelector('a[title]')?.getAttribute('title') ||
                           el.querySelector('.product-title, .title, h3, h4')?.textContent?.trim();
                
                // Get price - look for the price element
                let price = 0;
                let salePrice = null;
                const priceEl = el.querySelector('.s-product-card-entry__price, [class*="price"], .price');
                if (priceEl) {
                    const priceText = priceEl.textContent || '';
                    const numbers = priceText.match(/[\d,]+\.?\d*/g);
                    if (numbers && numbers.length > 0) {
                        // Usually first number is current price
                        price = parseFloat(numbers[0].replace(/,/g, ''));
                        if (numbers.length > 1) {
                            // Second might be original price (if on sale)
                            const origPrice = parseFloat(numbers[1].replace(/,/g, ''));
                            if (origPrice > price) {
                                salePrice = price;
                                price = origPrice;
                            }
                        }
                    }
                }
                
                if (name && name.length > 1) {
                    products.push({
                        name: name.substring(0, 100),
                        price: price,
                        salePrice: salePrice,
                        currency: 'ر.س',
                        inStock: true
                    });
                    console.log('✅ Product:', name, price);
                }
            });
        }
        
        // Method 3: Try to find any product-like elements
        if (products.length === 0) {
            console.log('🔍 Trying alternative selectors...');
            const allLinks = document.querySelectorAll('a[href*="/p/"], a[href*="/product/"]');
            allLinks.forEach((link, i) => {
                if (i >= 30) return;
                const name = link.textContent?.trim() || link.getAttribute('title');
                if (name && name.length > 3 && name.length < 100) {
                    // Try to find price near this link
                    const parent = link.closest('div, article, li');
                    let price = 0;
                    if (parent) {
                        const priceText = parent.textContent || '';
                        const priceMatch = priceText.match(/(\d+[\d,]*)\s*(ر\.س|ريال|SAR)/);
                        if (priceMatch) {
                            price = parseFloat(priceMatch[1].replace(/,/g, ''));
                        }
                    }
                    products.push({ name, price, currency: 'ر.س', inStock: true });
                }
            });
        }
        
        console.log('📦 Total scraped:', products.length, 'products');
        return products;
    }

    // Fetch store data from Salla API (when access token is available)
    async function loadStoreData() {
        try {
            // First, try to scrape products from the current page
            const pageProducts = scrapeProductsFromPage();
            if (pageProducts.length > 0) {
                storeData.products = pageProducts;
                storeData.storeName = document.title?.split('|')[0]?.trim() || document.title?.split('-')[0]?.trim() || 'المتجر';
                storeData.loaded = true;
                console.log('✅ Loaded', pageProducts.length, 'products from page');
                return;
            }
            
            // Fallback: Get store data from Appwrite (cached by webhook)
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
            // Build the query - merchantId is now INTEGER
            const merchantIdInt = parseInt(storeId) || 0;
            const query = encodeURIComponent(`equal("merchantId",${merchantIdInt})`);
            const url = `${config.appwriteEndpoint}/databases/${config.databaseId}/collections/${config.collectionId}/documents?queries[]=${query}`;
            
            console.log('🔍 Fetching store data from Appwrite...');
            console.log('🏪 Store ID:', storeId, '→ Int:', merchantIdInt);
            
            const response = await fetch(url, { 
                method: 'GET',
                headers: { 
                    'X-Appwrite-Project': config.appwriteProjectId,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.log('⚠️ Appwrite response not OK:', response.status);
                return null;
            }
            const data = await response.json();
            console.log('📦 Appwrite response:', data);
            
            // Parse data from 'notes' field (where we store the JSON)
            if (data.documents?.[0]?.notes) {
                try {
                    const cachedData = JSON.parse(data.documents[0].notes);
                    console.log('📦 Cached data:', cachedData);
                    return {
                        storeName: cachedData.store || cachedData.storeName || 'متجر',
                        accessToken: cachedData.token || cachedData.accessToken,
                        // Products might not be cached in notes due to size limit
                        cachedProducts: '[]',
                        cachedShipping: '[]',
                        cachedCoupons: '[]',
                        cachedOffers: '[]'
                    };
                } catch (e) {
                    console.log('⚠️ Could not parse notes:', e.message);
                }
            }
            
            return data.documents?.[0];
        } catch (e) {
            console.log('⚠️ Could not fetch from Appwrite (CORS):', e.message);
            // Try alternative: fetch products directly from Salla public API
            return await fetchFromSallaPublic(storeId);
        }
    }

    // Fallback: Try to get basic store info from Salla's public pages
    async function fetchFromSallaPublic(storeId) {
        try {
            // This is a fallback - we'll try to detect products from the page itself
            const products = [];
            
            // Try multiple selectors that Salla stores might use
            const productSelectors = [
                '[data-product-id]',
                '.product-card',
                '.product-item',
                '.product-block',
                '.s-product-card',
                '.product',
                '[class*="product"]',
                'article[class*="product"]'
            ];
            
            let productElements = [];
            for (const selector of productSelectors) {
                const found = document.querySelectorAll(selector);
                if (found.length > 0) {
                    productElements = found;
                    console.log('📦 Found products with selector:', selector, found.length);
                    break;
                }
            }
            
            productElements.forEach((el, i) => {
                if (i >= 30) return; // Limit to 30 products
                
                // Try multiple name selectors
                const nameSelectors = ['.product-title', '.product-name', 'h3', 'h4', 'h5', '.title', '[class*="title"]', '[class*="name"]', 'a'];
                let name = null;
                for (const sel of nameSelectors) {
                    const nameEl = el.querySelector(sel);
                    if (nameEl?.textContent?.trim()) {
                        name = nameEl.textContent.trim();
                        break;
                    }
                }
                
                // Try multiple price selectors
                const priceSelectors = ['.product-price', '.price', '[data-price]', '.amount', '[class*="price"]', '.s-price', 'span[class*="price"]'];
                let price = null;
                for (const sel of priceSelectors) {
                    const priceEl = el.querySelector(sel);
                    if (priceEl) {
                        const priceText = priceEl.textContent || priceEl.getAttribute('data-price') || '';
                        const priceMatch = priceText.match(/[\d,]+\.?\d*/);
                        if (priceMatch) {
                            price = parseFloat(priceMatch[0].replace(',', ''));
                            break;
                        }
                    }
                }
                
                if (name && name.length > 2) {
                    products.push({ 
                        name, 
                        price: price || 0, 
                        currency: 'SAR',
                        inStock: true 
                    });
                    console.log('📦 Found product:', name, price);
                }
            });

            if (products.length > 0) {
                console.log('📦 Found', products.length, 'products from page');
                return {
                    storeName: document.title?.split('|')[0]?.trim() || 'المتجر',
                    cachedProducts: JSON.stringify(products),
                    cachedShipping: '[]',
                    cachedCoupons: '[]',
                    cachedOffers: '[]'
                };
            }
            
            return null;
        } catch (e) {
            console.log('⚠️ Could not extract products from page:', e.message);
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
            productList = `(منتجات تجريبية - لم يتم تحميل بيانات المتجر)
1. فستان سهرة أسود أنيق - 450 ريال
2. عباية مطرزة فاخرة - 850 ريال
3. بلوزة قطن كاجوال - 120 ريال
4. جاكيت جينز نسائي - 280 ريال
5. تنورة ميدي بليسيه - 180 ريال
6. طقم بيجاما حرير - 320 ريال`;
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

        // English system prompt
        if (!isRTL) {
            let productListEn = '';
            if (storeData.products.length > 0) {
                productListEn = storeData.products.slice(0, 30).map((p, i) => {
                    let priceText = `${p.price} SAR`;
                    if (p.salePrice && p.salePrice < p.price) {
                        priceText = `${p.salePrice} SAR (was ${p.price})`;
                    }
                    const stockStatus = p.inStock !== false ? '✓' : '(out of stock)';
                    return `${i+1}. ${p.name} - ${priceText} ${stockStatus}`;
                }).join('\n');
            } else {
                productListEn = `(Demo products - store data not loaded)
1. Elegant Black Evening Dress - 450 SAR
2. Luxury Embroidered Abaya - 850 SAR
3. Casual Cotton Blouse - 120 SAR
4. Women's Denim Jacket - 280 SAR
5. Pleated Midi Skirt - 180 SAR
6. Silk Pajama Set - 320 SAR`;
            }

            let shippingInfoEn = '';
            if (storeData.shipping.length > 0) {
                shippingInfoEn = storeData.shipping.map(s => {
                    let text = `- ${s.name}`;
                    if (s.methods && s.methods.length > 0) {
                        text += ': ' + s.methods.map(m => `${m.name} (${m.cost} SAR)`).join(', ');
                    }
                    return text;
                }).join('\n');
            } else {
                shippingInfoEn = `- Within Saudi Arabia: 25 SAR (free over 200 SAR) - 2-5 days`;
            }

            let couponsInfoEn = '';
            if (storeData.coupons.length > 0) {
                couponsInfoEn = storeData.coupons.map(c => {
                    const discountText = c.type === 'percentage' ? `${c.discount}% off` : `${c.discount} SAR off`;
                    return `- Code "${c.code}": ${discountText}`;
                }).join('\n');
            } else {
                couponsInfoEn = '- No active coupons currently';
            }

            let offersInfoEn = '';
            if (storeData.offers.length > 0) {
                offersInfoEn = storeData.offers.map(o => {
                    let text = `- ${o.name}`;
                    if (o.discount) text += ` (${o.discount}% off)`;
                    return text;
                }).join('\n');
            } else {
                offersInfoEn = '- No special offers currently';
            }

            return `You are ALLaM, a friendly AI assistant for "${storeData.storeName}". Respond in English.

═══════════════════════════════════
📦 Available Products:
═══════════════════════════════════
${productListEn}

═══════════════════════════════════
🚚 Shipping & Delivery:
═══════════════════════════════════
${shippingInfoEn}

═══════════════════════════════════
🏷️ Active Discount Codes:
═══════════════════════════════════
${couponsInfoEn}

═══════════════════════════════════
🎉 Special Offers:
═══════════════════════════════════
${offersInfoEn}

═══════════════════════════════════
💳 Payment Methods: Mada, Visa, Mastercard, Apple Pay, Tabby
🔄 Returns: Within 14 days of receiving the order

═══════════════════════════════════
📞 Customer Support:
═══════════════════════════════════
${storeData.supportContact || 'Contact info available on the website'}

═══════════════════════════════════
Response Rules:
═══════════════════════════════════
- Be friendly and helpful
- Keep responses brief and clear
- If asked about a listed product, provide the price
- If there's an applicable coupon, suggest it
- If asked about an unlisted product, say "Sorry, we don't have that product"
- If asked for support contact, provide the contact info above
- Never invent products, prices, or coupons not in the lists above`;
        }

        // Arabic system prompt (default)
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
📞 التواصل والدعم:
═══════════════════════════════════
${storeData.supportContact || 'معلومات التواصل موجودة في الموقع'}

═══════════════════════════════════
قواعد الرد:
═══════════════════════════════════
- استخدم اللهجة السعودية (وش، الحين، تمام، يعطيك العافية)
- كن مختصر وودود
- إذا سأل عن منتج موجود، أعطه السعر
- إذا فيه كوبون مناسب، اقترحه على العميل
- إذا سأل عن منتج مو موجود، قول "للأسف ما عندنا هذا المنتج"
- إذا سأل عن رقم الدعم أو التواصل، أعطه المعلومات أعلاه
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
                    padding: 15px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                ">
                    <div>
                        <h3 style="margin: 0; font-size: 18px;">${t.assistant}</h3>
                        <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.9;">${t.connected}</p>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <button id="lang-switch-btn" style="
                            background: rgba(255,255,255,0.2);
                            border: 1px solid rgba(255,255,255,0.3);
                            color: white;
                            font-size: 12px;
                            cursor: pointer;
                            padding: 5px 10px;
                            border-radius: 15px;
                            font-weight: 500;
                            transition: background 0.3s ease;
                        ">${currentLang === 'ar' ? 'EN' : 'عربي'}</button>
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
                </div>

                <!-- Messages -->
                <div id="chat-messages" style="
                    flex: 1;
                    padding: 20px;
                    overflow-y: auto;
                    background: #f8f9fa;
                    direction: ${isRTL ? 'rtl' : 'ltr'};
                "></div>

                <!-- Input -->
                <div id="chat-input-container" style="
                    display: flex;
                    padding: 15px;
                    border-top: 1px solid #e0e0e0;
                    background: white;
                    direction: ${isRTL ? 'rtl' : 'ltr'};
                ">
                    <input type="text" id="chat-input" placeholder="${t.placeholder}" style="
                        flex: 1;
                        padding: 12px;
                        border: 2px solid #e0e0e0;
                        border-radius: 8px;
                        font-size: 14px;
                        outline: none;
                        direction: ${isRTL ? 'rtl' : 'ltr'};
                    ">
                    <button id="send-btn" style="
                        ${isRTL ? 'margin-right: 10px;' : 'margin-left: 10px;'}
                        padding: 12px 20px;
                        background: ${config.chatbotColor};
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 500;
                        transition: background 0.3s ease;
                    ">${t.send}</button>
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
        const chatWindow = document.getElementById('chat-window');
        const closeBtn = document.getElementById('close-chat');
        const sendBtn = document.getElementById('send-btn');
        const input = document.getElementById('chat-input');
        const langBtn = document.getElementById('lang-switch-btn');

        bubble.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', toggleChat);
        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Language switch button
        langBtn.addEventListener('click', switchLanguage);
        langBtn.addEventListener('mouseenter', () => {
            langBtn.style.background = 'rgba(255,255,255,0.3)';
        });
        langBtn.addEventListener('mouseleave', () => {
            langBtn.style.background = 'rgba(255,255,255,0.2)';
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

        // Send welcome message (use translated version)
        addMessage(t.welcome, 'bot');

        console.log('✅ AI Chatbot Widget loaded!');
        console.log('📍 Store ID:', storeId);
        console.log('🌐 Language:', currentLang);
    }

    function toggleChat() {
        const chatWindow = document.getElementById('chat-window');
        const bubble = document.getElementById('chat-bubble');
        
        if (chatWindow.style.display === 'none' || !chatWindow.style.display) {
            chatWindow.style.display = 'flex';
            bubble.style.transform = 'scale(0.9)';
            document.getElementById('chat-input').focus();
        } else {
            chatWindow.style.display = 'none';
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
                const fallback = t.error;
                addMessage(fallback, 'bot');
            });
    }

    async function callAI(message) {
        // Use dynamic system prompt with real or demo store data
        const systemPrompt = buildSystemPrompt();

        try {
            // Send to LM Studio (OpenAI format) via Cloudflare tunnel
            const response = await fetch(config.aiWorkerUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
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
            return data.choices?.[0]?.message?.content || t.notUnderstood;
        } catch (error) {
            console.error('AI API Error:', error);
            return getLocalFallback(message);
        }
    }

    function getLocalFallback(message) {
        const lower = message.toLowerCase();
        
        // English patterns
        if (!isRTL) {
            if (lower.includes('hi') || lower.includes('hello') || lower.includes('hey')) {
                return 'Hello! How can I help you today? 😊';
            }
            if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
                return 'Sure! Tell me the product name and I\'ll give you the price 🏷️';
            }
            if (lower.includes('ship') || lower.includes('delivery') || lower.includes('deliver')) {
                return 'Shipping usually takes 2-5 days 🚚';
            }
            if (lower.includes('thank')) {
                return 'You\'re welcome! Happy to help 😊';
            }
            return 'Sure! What exactly would you like to know?';
        }
        
        // Arabic patterns (default)
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
