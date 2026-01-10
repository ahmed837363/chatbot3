/**
 * AI Chatbot Widget - Production Ready v2.8
 * Embed this on any website to add AI chat support
 * Supports: Arabic (Saudi dialect) and English with live language switching
 * 
 * Usage:
 * <script src="https://your-cdn/chatbot-widget.js" data-store-id="YOUR_STORE_ID" data-lang="ar"></script>
 */

(function() {
    'use strict';
    
    console.log('🤖 AI Chatbot Widget v2.8 loading...');

    // ===== DEBUG LOGGING SYSTEM =====
    const DEBUG_LOG = {
        enabled: true,
        logs: [],
        maxLogs: 50,
        
        add(type, data) {
            if (!this.enabled) return;
            const entry = {
                timestamp: new Date().toISOString(),
                type: type,
                data: data
            };
            this.logs.push(entry);
            if (this.logs.length > this.maxLogs) {
                this.logs.shift();
            }
            // Save to localStorage
            try {
                localStorage.setItem('chatbot_debug_log', JSON.stringify(this.logs, null, 2));
            } catch(e) {}
            console.log(`📋 [${type}]`, data);
        },
        
        getAll() {
            return this.logs;
        },
        
        export() {
            const blob = new Blob([JSON.stringify(this.logs, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `chatbot_log_${Date.now()}.json`;
            a.click();
        },
        
        show() {
            console.log('📋 ===== CHATBOT DEBUG LOG =====');
            console.log(JSON.stringify(this.logs, null, 2));
            return this.logs;
        }
    };
    
    // Make debug available globally
    window.chatbotDebug = DEBUG_LOG;
    console.log('💡 Debug: Type chatbotDebug.show() to see logs, chatbotDebug.export() to download');

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
        productsCollectionId: 'products', // NEW: Products collection
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

    // Scrape products directly from the current page - REAL TIME
    function scrapeProductsFromPage() {
        const products = [];
        console.log('🔍 Scraping products from page...');
        
        // Method 1: Use Salla's Twilight global data (most reliable!)
        if (window.Salla || window.salla) {
            const sallaObj = window.Salla || window.salla;
            console.log('🔍 Found Salla object:', Object.keys(sallaObj));
            
            // Try to get products from Salla's data
            if (sallaObj.products || sallaObj.product) {
                const prods = sallaObj.products || [sallaObj.product];
                prods.forEach(p => {
                    if (p && p.name) {
                        products.push({
                            name: p.name,
                            price: p.price?.amount || p.price || 0,
                            salePrice: p.sale_price?.amount || p.sale_price || null,
                            currency: p.price?.currency || 'SAR',
                            inStock: p.quantity > 0 || p.status === 'sale'
                        });
                    }
                });
            }
        }
        
        // Method 2: Look for Salla's JSON data in page scripts
        if (products.length === 0) {
            const scripts = document.querySelectorAll('script[type="application/json"], script[type="application/ld+json"]');
            scripts.forEach(script => {
                try {
                    const data = JSON.parse(script.textContent);
                    if (data['@type'] === 'Product' || data.product) {
                        const p = data.product || data;
                        products.push({
                            name: p.name,
                            price: parseFloat(p.offers?.price || p.price || 0),
                            currency: p.offers?.priceCurrency || 'SAR',
                            inStock: p.offers?.availability?.includes('InStock') !== false
                        });
                    }
                    if (data.products && Array.isArray(data.products)) {
                        data.products.forEach(p => {
                            products.push({
                                name: p.name,
                                price: parseFloat(p.price?.amount || p.price || 0),
                                currency: 'SAR',
                                inStock: true
                            });
                        });
                    }
                } catch (e) { /* ignore parse errors */ }
            });
        }
        
        // Method 3: Scrape from DOM - Salla product cards
        if (products.length === 0) {
            // Common Salla selectors
            const selectors = [
                '.s-product-card-entry',
                '.s-product-card',
                '[data-product-id]',
                '.product-block',
                '.product-card',
                'article[class*="product"]',
                '.products-list .product',
                '[class*="ProductCard"]'
            ];
            
            let productElements = [];
            for (const sel of selectors) {
                productElements = document.querySelectorAll(sel);
                if (productElements.length > 0) {
                    console.log('🔍 Found products with:', sel, productElements.length);
                    break;
                }
            }
            
            productElements.forEach((el, i) => {
                if (i >= 50) return;
                
                // Get product ID and category from Salla data attributes
                const productId = el.getAttribute('data-product-id') || 
                                  el.querySelector('[data-product-id]')?.getAttribute('data-product-id') || '';
                const category = el.getAttribute('data-category') || 
                                 el.querySelector('[data-category]')?.getAttribute('data-category') ||
                                 el.getAttribute('data-product-type') ||
                                 el.querySelector('[data-product-type]')?.getAttribute('data-product-type') || '';
                
                // Get product name - try multiple selectors (Salla-specific first)
                let name = null;
                const nameSelectors = [
                    // Salla Twilight theme specific
                    '.s-product-card-entry__title a',
                    '.s-product-card-entry__title span',
                    '.s-product-card-entry__title',
                    '.s-product-card__title a',
                    '.s-product-card__title',
                    // Check data attributes
                    '[data-product-name]',
                    '[data-name]',
                    // Generic
                    '.product-title a',
                    '.product-title',
                    '.product-name',
                    '[class*="product"][class*="title"] a',
                    '[class*="product"][class*="name"]',
                    'h2 a', 'h3 a', 'h4 a',
                    'h2', 'h3', 'h4',
                    'a[href*="/p/"]'
                ];
                
                for (const sel of nameSelectors) {
                    const nameEl = el.querySelector(sel);
                    if (nameEl) {
                        // Try data attribute first
                        name = nameEl.getAttribute('data-product-name') || 
                               nameEl.getAttribute('data-name') ||
                               nameEl.getAttribute('title') ||
                               nameEl.textContent?.trim();
                        // Clean the name
                        if (name) {
                            name = name.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
                        }
                        if (name && name.length > 1 && name.length < 150) {
                            console.log('📝 Found name with selector:', sel, '→', name);
                            break;
                        }
                        name = null;
                    }
                }
                
                // Fallback: Try to get name from any link to product page
                if (!name) {
                    const productLink = el.querySelector('a[href*="/p/"], a[href*="/product/"]');
                    if (productLink) {
                        name = productLink.getAttribute('title') || productLink.textContent?.trim();
                        if (name) {
                            name = name.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
                        }
                        if (name && name.length > 1 && name.length < 150) {
                            console.log('📝 Found name from link:', name);
                        } else {
                            name = null;
                        }
                    }
                }
                
                // Get price - look for price elements (improved for Salla)
                let price = 0;
                let salePrice = null;
                
                // Helper function to convert Arabic-Indic numerals to Western
                const convertArabicNumerals = (str) => {
                    const arabicNumerals = '٠١٢٣٤٥٦٧٨٩';
                    const persianNumerals = '۰۱۲۳۴۵۶۷۸۹';
                    let result = str;
                    for (let i = 0; i < 10; i++) {
                        result = result.replace(new RegExp(arabicNumerals[i], 'g'), i.toString());
                        result = result.replace(new RegExp(persianNumerals[i], 'g'), i.toString());
                    }
                    return result;
                };
                
                // Method 1: Try data attributes first (most reliable)
                const dataPrice = el.getAttribute('data-price') || 
                                  el.querySelector('[data-price]')?.getAttribute('data-price') ||
                                  el.querySelector('[data-product-price]')?.getAttribute('data-product-price');
                if (dataPrice) {
                    price = parseFloat(convertArabicNumerals(dataPrice)) || 0;
                }
                
                // Method 2: Look for price in nested elements
                if (price === 0) {
                    const priceSelectors = [
                        '.s-product-card-entry__price-wrapper',
                        '.s-product-card-entry__price',
                        '.s-product-card__price',
                        '.product-price',
                        '.price-wrapper',
                        '.price',
                        '[class*="price"]'
                    ];
                    
                    for (const sel of priceSelectors) {
                        const priceContainer = el.querySelector(sel);
                        if (priceContainer) {
                            // Get all text content and convert Arabic numerals
                            let allText = priceContainer.innerText || priceContainer.textContent || '';
                            allText = convertArabicNumerals(allText);
                            console.log('💰 Price text found:', allText.substring(0, 50));
                            
                            // Match numbers (handle both 149 and 149.00 formats)
                            const numbers = allText.match(/(\d[\d,]*\.?\d*)/g);
                            if (numbers && numbers.length > 0) {
                                // Filter out very small numbers (might be decimals or ratings)
                                const validPrices = numbers
                                    .map(n => parseFloat(n.replace(/,/g, '')))
                                    .filter(n => n >= 1 && n < 100000);
                                
                                if (validPrices.length > 0) {
                                    // If there are two prices, smaller is sale price
                                    if (validPrices.length >= 2) {
                                        validPrices.sort((a, b) => a - b);
                                        salePrice = validPrices[0]; // Smaller = sale
                                        price = validPrices[validPrices.length - 1]; // Larger = original
                                    } else {
                                        price = validPrices[0];
                                    }
                                    console.log('💰 Extracted price:', price, 'sale:', salePrice);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Method 3: Look anywhere in the product card for price pattern
                if (price === 0) {
                    let cardText = el.innerText || el.textContent || '';
                    cardText = convertArabicNumerals(cardText);
                    // Look for price patterns like "149 ر.س" or "SAR 149" or just "149"
                    const pricePatterns = [
                        /(\d[\d,]*\.?\d*)\s*(ر\.س|ريال|SAR|SR)/gi,
                        /(SAR|SR|ر\.س|ريال)\s*(\d[\d,]*\.?\d*)/gi,
                        /(\d{2,5}\.?\d{0,2})/g
                    ];
                    
                    for (const pattern of pricePatterns) {
                        const matches = cardText.match(pattern);
                        if (matches && matches.length > 0) {
                            // Extract just the number
                            const numMatch = matches[0].match(/\d[\d,]*\.?\d*/);
                            if (numMatch) {
                                price = parseFloat(numMatch[0].replace(/,/g, ''));
                                if (price >= 1 && price < 100000) {
                                    console.log('💰 Found price in text:', price);
                                    break;
                                }
                            }
                        }
                    }
                }
                
                if (name && name.length > 1) {
                    // Add number suffix if name is generic to differentiate products
                    let displayName = name.substring(0, 100);
                    
                    // Check if this name already exists and add a number
                    const existingCount = products.filter(p => p.name.startsWith(name.split(' ')[0])).length;
                    if (existingCount > 0) {
                        displayName = `${name} (${existingCount + 1})`;
                    }
                    
                    products.push({
                        name: displayName,
                        price: price,
                        salePrice: salePrice,
                        currency: 'ريال',
                        category: category || '',
                        productId: productId || '',
                        inStock: !el.classList.contains('out-of-stock') && !el.querySelector('.out-of-stock, .sold-out')
                    });
                    console.log('✅ Scraped:', displayName, '→', salePrice || price, 'ريال', category ? `[${category}]` : '');
                }
            });
        }
        
        // Method 4: Fallback - find any price + nearby text
        if (products.length === 0) {
            console.log('🔍 Trying fallback method...');
            const priceElements = document.querySelectorAll('[class*="price"], .amount');
            priceElements.forEach((priceEl, i) => {
                if (i >= 20 || products.length >= 20) return;
                
                const priceText = priceEl.textContent || '';
                const priceMatch = priceText.match(/([\d,]+\.?\d*)\s*(ر\.س|ريال|SAR)?/);
                if (priceMatch) {
                    const price = parseFloat(priceMatch[1].replace(/,/g, ''));
                    if (price > 0 && price < 100000) {
                        // Look for nearby product name
                        const parent = priceEl.closest('div, article, li, section');
                        if (parent) {
                            const link = parent.querySelector('a[href*="/p/"], a[href*="/product/"]');
                            const name = link?.textContent?.trim() || link?.getAttribute('title') || 
                                        parent.querySelector('h2, h3, h4, h5')?.textContent?.trim();
                            if (name && name.length > 2 && name.length < 100) {
                                products.push({ name, price, currency: 'ر.س', inStock: true });
                            }
                        }
                    }
                }
            });
        }
        
        console.log('📦 Total scraped:', products.length, 'products');
        
        // Log scraped products for debugging
        DEBUG_LOG.add('PRODUCTS_SCRAPED', {
            count: products.length,
            products: products.map(p => ({
                name: p.name,
                price: p.price,
                salePrice: p.salePrice
            }))
        });
        
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
                
                // Fetch products from products collection
                const productsFromDB = await fetchProductsFromAppwrite(storeId);
                if (productsFromDB.length > 0) {
                    storeData.products = productsFromDB;
                    console.log('✅ Loaded', productsFromDB.length, 'products from Appwrite database');
                }
                
                storeData.loaded = true;
                
                console.log('✅ Store data loaded from Appwrite:');
                console.log('   - Store:', storeData.storeName);
                console.log('   - Products:', storeData.products.length);
            }
        } catch (error) {
            console.log('ℹ️ Using demo mode - no store data loaded:', error.message);
        }
    }

    // NEW: Fetch products from Appwrite products collection
    async function fetchProductsFromAppwrite(storeId) {
        try {
            const storeIdInt = parseInt(storeId) || 0;
            const query = encodeURIComponent(`equal("storeId",${storeIdInt})`);
            const url = `${config.appwriteEndpoint}/databases/${config.databaseId}/collections/${config.productsCollectionId}/documents?queries[]=${query}&queries[]=${encodeURIComponent('limit(50)')}`;
            
            console.log('🔍 Fetching products from Appwrite...');
            
            const response = await fetch(url, { 
                method: 'GET',
                headers: { 
                    'X-Appwrite-Project': config.appwriteProjectId,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.log('⚠️ Products fetch failed:', response.status);
                return [];
            }
            
            const data = await response.json();
            console.log('📦 Products from DB:', data.total);
            
            if (data.documents && data.documents.length > 0) {
                return data.documents.map(doc => ({
                    name: doc.name || 'منتج',
                    nameEn: doc.nameEn || '', // English name (optional)
                    price: doc.price || 0,
                    salePrice: doc.salePrice || null,
                    currency: doc.currency || 'SAR',
                    description: doc.description || '',
                    inStock: doc.inStock !== false,
                    imageUrl: doc.imageUrl || ''
                }));
            }
            
            return [];
        } catch (e) {
            console.log('⚠️ Products fetch error:', e.message);
            return [];
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
        // Debug: Log what products we have
        console.log('🤖 Building prompt with', storeData.products.length, 'products');
        if (storeData.products.length > 0) {
            console.log('📋 First 5 products:', storeData.products.slice(0, 5).map(p => `${p.name}: ${p.price}`));
        }
        
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
Response Rules (IMPORTANT - Follow Exactly):
═══════════════════════════════════
1. The ONLY available products are listed above - there are NO other products
2. If customer asks about a product (like jacket, bag, shoes, etc.) that is NOT in the list above, say: "Sorry, we don't have [product name] right now, but we have dresses and blouses"
3. Before responding, verify the product EXISTS in the list above
4. Do NOT invent any product or price not in the list
5. Be friendly and brief
6. Do NOT add any URLs or links`;
        }

        // Arabic system prompt (default)
        return `أنت علام، مساعد ذكي لـ "${storeData.storeName}". تتحدث باللهجة السعودية فقط.

═══════════════════════════════════
📦 المنتجات المتوفرة (هذه القائمة الكاملة):
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
قواعد الرد (مهم جداً - اتبعها بدقة):
═══════════════════════════════════
1. رد بالعربي فقط - لا تستخدم كلمات انجليزية مثل SAR، استخدم "ريال" بدلاً منها
2. المنتجات المتوفرة فقط هي الموجودة في القائمة أعلاه - لا يوجد منتجات أخرى
3. إذا سأل العميل عن منتج غير موجود في القائمة، قول: "للأسف ما عندنا [اسم المنتج] حالياً"
4. قبل ما ترد، تأكد إن المنتج موجود بالضبط في القائمة
5. لا تخترع أي منتج أو سعر غير موجود في القائمة
6. استخدم اللهجة السعودية (وش، الحين، تمام، يعطيك العافية)
6. كن مختصر وودود
7. لا تضيف أي روابط أو URLs`;
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
        
        // Re-scrape products when user opens chat (in case they navigated)
        bubble.addEventListener('click', () => {
            // Refresh products every time chat is opened
            const freshProducts = scrapeProductsFromPage();
            if (freshProducts.length > 0) {
                storeData.products = freshProducts;
                console.log('🔄 Refreshed products:', freshProducts.length);
            }
        });

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

    // ===== PRODUCT VERIFICATION ALGORITHM =====
    // Pre-check if user is asking about a product and verify it exists
    function verifyProductQuestion(message) {
        const msg = message.toLowerCase();
        
        // Product keywords in Arabic and English
        const productKeywords = {
            // Arabic clothing items
            'جاكيت': 'جاكيت',
            'جاكيتات': 'جاكيت',
            'شنطة': 'شنطة',
            'شنط': 'شنطة',
            'حذاء': 'حذاء',
            'أحذية': 'حذاء',
            'احذية': 'حذاء',
            'حقيبة': 'حقيبة',
            'حقائب': 'حقيبة',
            'ساعة': 'ساعة',
            'ساعات': 'ساعة',
            'نظارة': 'نظارة',
            'نظارات': 'نظارة',
            'قميص': 'قميص',
            'قمصان': 'قميص',
            'بنطلون': 'بنطلون',
            'بنطال': 'بنطلون',
            'بناطيل': 'بنطلون',
            'تنورة': 'تنورة',
            'تنانير': 'تنورة',
            'بلوزة': 'بلوزة',
            'بلايز': 'بلوزة',
            'فستان': 'فستان',
            'فساتين': 'فستان',
            'عباية': 'عباية',
            'عبايات': 'عباية',
            'طرحة': 'طرحة',
            'طرح': 'طرحة',
            'شال': 'شال',
            'شيلة': 'شيلة',
            // English
            'jacket': 'jacket',
            'jackets': 'jacket',
            'bag': 'bag',
            'bags': 'bag',
            'shoe': 'shoe',
            'shoes': 'shoe',
            'watch': 'watch',
            'watches': 'watch',
            'dress': 'dress',
            'dresses': 'dress',
            'blouse': 'blouse',
            'blouses': 'blouse',
            'pants': 'pants',
            'shirt': 'shirt',
            'skirt': 'skirt',
            'abaya': 'abaya'
        };
        
        // Check if message is asking about a product
        const askingPatterns = [
            /عندكم|عندك|فيه|يوجد|متوفر|موجود/,  // Arabic "do you have"
            /كم سعر|بكم|سعر/,  // Arabic "how much"
            /أبي|ابي|أبغى|ابغى|اريد|أريد/,  // Arabic "I want"
            /do you have|have any|got any/i,  // English
            /how much|price of|cost of/i,  // English
            /i want|looking for|need/i  // English
        ];
        
        const isAskingAboutProduct = askingPatterns.some(p => p.test(msg));
        
        if (!isAskingAboutProduct) {
            return { verified: true, productAsked: null };  // Not a product question, proceed to AI
        }
        
        // Find which product they're asking about
        let productAsked = null;
        for (const [keyword, normalized] of Object.entries(productKeywords)) {
            if (msg.includes(keyword)) {
                productAsked = normalized;
                break;
            }
        }
        
        if (!productAsked) {
            return { verified: true, productAsked: null };  // Can't identify product, let AI handle
        }
        
        // Check if this product exists in our scraped products
        const productNames = storeData.products.map(p => p.name.toLowerCase());
        const hasProduct = productNames.some(name => 
            name.includes(productAsked) || productAsked.includes(name.split(' ')[0])
        );
        
        console.log('🔍 Product check:', productAsked, '→', hasProduct ? '✅ FOUND' : '❌ NOT FOUND');
        DEBUG_LOG.add('PRODUCT_CHECK', {
            userMessage: message,
            productAsked: productAsked,
            found: hasProduct,
            availableProducts: storeData.products.map(p => p.name)
        });
        
        if (!hasProduct) {
            // Product doesn't exist - return pre-written response
            const availableTypes = [...new Set(storeData.products.map(p => p.name.split(' ')[0]))].slice(0, 5).join('، ');
            return {
                verified: false,
                productAsked: productAsked,
                response: isRTL 
                    ? `للأسف ما عندنا ${productAsked} حالياً 😔\nبس عندنا: ${availableTypes}\nتبي تشوف شي منهم؟`
                    : `Sorry, we don't have ${productAsked} right now 😔\nBut we have: ${availableTypes}\nWould you like to see any of these?`
            };
        }
        
        // Product exists, find matching products
        const matchingProducts = storeData.products.filter(p => 
            p.name.toLowerCase().includes(productAsked)
        );
        
        return { 
            verified: true, 
            productAsked: productAsked,
            matchingProducts: matchingProducts
        };
    }

    async function callAI(message) {
        // ===== PRE-CHECK: Verify product exists before asking AI =====
        const verification = verifyProductQuestion(message);
        
        if (!verification.verified) {
            // Product doesn't exist - return immediate response without calling AI
            console.log('🚫 Product not found, returning pre-written response');
            return verification.response;
        }
        
        // Use dynamic system prompt with real or demo store data
        let systemPrompt = buildSystemPrompt();
        
        // If asking about a specific product that exists, add hint to prompt
        if (verification.matchingProducts && verification.matchingProducts.length > 0) {
            const productHint = verification.matchingProducts.map(p => 
                `${p.name}: ${p.salePrice || p.price} ريال${p.salePrice ? ` (بدل ${p.price})` : ''}`
            ).join('\n');
            systemPrompt += `\n\n⚠️ العميل يسأل عن ${verification.productAsked}. هذه المنتجات المطابقة:\n${productHint}`;
        }
        
        console.log('🤖 Calling AI with', storeData.products.length, 'products in context');
        console.log('📝 User message:', message);
        
        // Log the full request
        DEBUG_LOG.add('AI_REQUEST', {
            userMessage: message,
            productsInContext: storeData.products.length,
            productsList: storeData.products.slice(0, 30).map(p => `${p.name}: ${p.price} ${p.currency}`),
            systemPromptPreview: systemPrompt.substring(0, 500) + '...'
        });

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
                DEBUG_LOG.add('AI_ERROR', { status: response.status, statusText: response.statusText });
                throw new Error('API request failed: ' + response.status);
            }

            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content || t.notUnderstood;
            
            // Log the response
            DEBUG_LOG.add('AI_RESPONSE', {
                userMessage: message,
                aiResponse: aiResponse,
                model: data.model || 'unknown'
            });
            
            console.log('✅ AI Response received:', aiResponse.substring(0, 100));
            return aiResponse;
        } catch (error) {
            console.error('AI API Error:', error);
            DEBUG_LOG.add('AI_ERROR', { error: error.message });
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
