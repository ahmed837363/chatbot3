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
    
    console.log('ðŸ¤– AI Chatbot Widget v2.8 loading...');

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
            console.log(`ðŸ“‹ [${type}]`, data);
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
            console.log('ðŸ“‹ ===== CHATBOT DEBUG LOG =====');
            console.log(JSON.stringify(this.logs, null, 2));
            return this.logs;
        }
    };
    
    // Make debug available globally
    window.chatbotDebug = DEBUG_LOG;
    console.log('ðŸ’¡ Debug: Type chatbotDebug.show() to see logs, chatbotDebug.export() to download');

    // Bilingual text configuration
    const texts = {
        ar: {
            welcome: 'Ù‡Ù„Ø§ ÙˆØ§Ù„Ù„Ù‡! ÙƒÙŠÙ Ø£Ù‚Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯Ùƒ Ø§Ù„ÙŠÙˆÙ…ØŸ ðŸ˜Š',
            placeholder: 'Ø§ÙƒØªØ¨ Ø±Ø³Ø§Ù„ØªÙƒ...',
            send: 'Ø¥Ø±Ø³Ø§Ù„',
            assistant: 'ðŸ¤– Ù…Ø³Ø§Ø¹Ø¯ Ø°ÙƒÙŠ',
            connected: 'Ù…ØªØµÙ„',
            error: 'Ø¹Ø°Ø±Ø§Ù‹ØŒ Ø­ØµÙ„ Ø®Ø·Ø£. Ø¬Ø±Ø¨ Ù…Ø±Ø© Ø«Ø§Ù†ÙŠØ© ðŸ“ž',
            greeting: 'Ù‡Ù„Ø§ ÙˆØ§Ù„Ù„Ù‡! ÙˆØ´ Ø£Ù‚Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯Ùƒ ÙÙŠÙ‡ØŸ ðŸ˜Š',
            askPrice: 'Ø£Ø¨Ø´Ø±! Ù‚ÙˆÙ„ Ù„ÙŠ Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬ ÙˆØ£Ø¹Ø·ÙŠÙƒ Ø§Ù„Ø³Ø¹Ø± ðŸ·ï¸',
            shipping: 'Ø§Ù„Ø´Ø­Ù† ÙŠÙˆØµÙ„ Ø®Ù„Ø§Ù„ Ù¢-Ù¥ Ø£ÙŠØ§Ù… Ø¹Ø§Ø¯Ø© ðŸšš',
            thanks: 'Ø§Ù„Ø¹ÙÙˆ! ÙŠØ³Ø¹Ø¯Ù†ÙŠ Ø£Ø®Ø¯Ù…Ùƒ ðŸ˜Š',
            askMore: 'Ø£Ø¨Ø´Ø±! ÙˆØ´ ØªØ¨ÙŠ ØªØ¹Ø±Ù Ø¨Ø§Ù„Ø¶Ø¨Ø·ØŸ',
            notUnderstood: 'Ù…Ø§ Ù‚Ø¯Ø±Øª Ø£ÙÙ‡Ù…ØŒ Ø¬Ø±Ø¨ Ù…Ø±Ø© Ø«Ø§Ù†ÙŠØ©'
        },
        en: {
            welcome: 'Hello! How can I help you today? ðŸ˜Š',
            placeholder: 'Type your message...',
            send: 'Send',
            assistant: 'ðŸ¤– AI Assistant',
            connected: 'Online',
            error: 'Sorry, an error occurred. Please try again ðŸ“ž',
            greeting: 'Hello! How can I help you? ðŸ˜Š',
            askPrice: 'Sure! Tell me the product name and I\'ll give you the price ðŸ·ï¸',
            shipping: 'Shipping takes 2-5 days usually ðŸšš',
            thanks: 'You\'re welcome! Happy to help ðŸ˜Š',
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
        console.log('ðŸŒ Language switched to:', currentLang);
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
        if (langBtn) langBtn.textContent = currentLang === 'ar' ? 'EN' : 'Ø¹Ø±Ø¨ÙŠ';
    }

    // Configuration
    const config = {
        appwriteEndpoint: 'https://fra.cloud.appwrite.io/v1',
        appwriteProjectId: '694669640010920ea3f6',
        databaseId: '6946699d001194236820',
        collectionId: 'store_connections',
        productsCollectionId: 'products',
        // AI via Cloudflare Tunnel
        aiUrl: 'https://allam-ai.mayasahstyle.me/v1/chat/completions',
        aiModel: 'allam-7b-instruct-preview',
        chatbotColor: '#667eea',
        position: 'bottom-left',
        language: currentLang
    };

    // Get store ID and custom config from script tag
    const storeId = scriptTag?.getAttribute('data-store-id') || 'demo';
    const customAiUrl = scriptTag?.getAttribute('data-ai-url') || '';
    const supportContact = scriptTag?.getAttribute('data-support') || '';
    
    if (customAiUrl) {
        config.aiUrl = customAiUrl;
    }

    // Conversation history for context
    let conversationHistory = [];
    
    // Store data (products, shipping, etc.) - will be loaded from Salla API
    let storeData = {
        storeName: 'Ù…ØªØ¬Ø±',
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
        console.log('ðŸ” Scraping products from page...');
        
        // Method 1: Use Salla's Twilight global data (most reliable!)
        if (window.Salla || window.salla) {
            const sallaObj = window.Salla || window.salla;
            console.log('ðŸ” Found Salla object:', Object.keys(sallaObj));
            
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
                    console.log('ðŸ” Found products with:', sel, productElements.length);
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
                            console.log('ðŸ“ Found name with selector:', sel, 'â†’', name);
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
                            console.log('ðŸ“ Found name from link:', name);
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
                    const arabicNumerals = 'Ù Ù¡Ù¢Ù£Ù¤Ù¥Ù¦Ù§Ù¨Ù©';
                    const persianNumerals = 'Û°Û±Û²Û³Û´ÛµÛ¶Û·Û¸Û¹';
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
                            console.log('ðŸ’° Price text found:', allText.substring(0, 50));
                            
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
                                    console.log('ðŸ’° Extracted price:', price, 'sale:', salePrice);
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
                    // Look for price patterns like "149 Ø±.Ø³" or "SAR 149" or just "149"
                    const pricePatterns = [
                        /(\d[\d,]*\.?\d*)\s*(Ø±\.Ø³|Ø±ÙŠØ§Ù„|SAR|SR)/gi,
                        /(SAR|SR|Ø±\.Ø³|Ø±ÙŠØ§Ù„)\s*(\d[\d,]*\.?\d*)/gi,
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
                                    console.log('ðŸ’° Found price in text:', price);
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
                        currency: 'Ø±ÙŠØ§Ù„',
                        category: category || '',
                        productId: productId || '',
                        inStock: !el.classList.contains('out-of-stock') && !el.querySelector('.out-of-stock, .sold-out')
                    });
                    console.log('âœ… Scraped:', displayName, 'â†’', salePrice || price, 'Ø±ÙŠØ§Ù„', category ? `[${category}]` : '');
                }
            });
        }
        
        // Method 4: Fallback - find any price + nearby text
        if (products.length === 0) {
            console.log('ðŸ” Trying fallback method...');
            const priceElements = document.querySelectorAll('[class*="price"], .amount');
            priceElements.forEach((priceEl, i) => {
                if (i >= 20 || products.length >= 20) return;
                
                const priceText = priceEl.textContent || '';
                const priceMatch = priceText.match(/([\d,]+\.?\d*)\s*(Ø±\.Ø³|Ø±ÙŠØ§Ù„|SAR)?/);
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
                                products.push({ name, price, currency: 'Ø±.Ø³', inStock: true });
                            }
                        }
                    }
                }
            });
        }
        
        console.log('ðŸ“¦ Total scraped:', products.length, 'products');
        
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
                storeData.storeName = document.title?.split('|')[0]?.trim() || document.title?.split('-')[0]?.trim() || 'Ø§Ù„Ù…ØªØ¬Ø±';
                storeData.loaded = true;
                console.log('âœ… Loaded', pageProducts.length, 'products from page');
                return;
            }
            
            // Fallback: Get store data from Appwrite (cached by webhook)
            const storeDoc = await fetchStoreFromAppwrite(storeId);
            
            if (storeDoc) {
                storeData.storeName = storeDoc.storeName || 'Ù…ØªØ¬Ø±';
                
                // Fetch products from products collection
                const productsFromDB = await fetchProductsFromAppwrite(storeId);
                if (productsFromDB.length > 0) {
                    storeData.products = productsFromDB;
                    console.log('âœ… Loaded', productsFromDB.length, 'products from Appwrite database');
                }
                
                storeData.loaded = true;
                
                console.log('âœ… Store data loaded from Appwrite:');
                console.log('   - Store:', storeData.storeName);
                console.log('   - Products:', storeData.products.length);
            }
        } catch (error) {
            console.log('â„¹ï¸ Using demo mode - no store data loaded:', error.message);
        }
    }

    // NEW: Fetch products from Appwrite products collection
    async function fetchProductsFromAppwrite(storeId) {
        try {
            const storeIdInt = parseInt(storeId) || 0;
            const query = encodeURIComponent(`equal("storeId",${storeIdInt})`);
            const url = `${config.appwriteEndpoint}/databases/${config.databaseId}/collections/${config.productsCollectionId}/documents?queries[]=${query}&queries[]=${encodeURIComponent('limit(50)')}`;
            
            console.log('ðŸ” Fetching products from Appwrite...');
            
            const response = await fetch(url, { 
                method: 'GET',
                headers: { 
                    'X-Appwrite-Project': config.appwriteProjectId,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.log('âš ï¸ Products fetch failed:', response.status);
                return [];
            }
            
            const data = await response.json();
            console.log('ðŸ“¦ Products from DB:', data.total);
            
            if (data.documents && data.documents.length > 0) {
                return data.documents.map(doc => ({
                    name: doc.name || 'Ù…Ù†ØªØ¬',
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
            console.log('âš ï¸ Products fetch error:', e.message);
            return [];
        }
    }

    async function fetchStoreFromAppwrite(storeId) {
        try {
            // Build the query - merchantId is now INTEGER
            const merchantIdInt = parseInt(storeId) || 0;
            const query = encodeURIComponent(`equal("merchantId",${merchantIdInt})`);
            const url = `${config.appwriteEndpoint}/databases/${config.databaseId}/collections/${config.collectionId}/documents?queries[]=${query}`;
            
            console.log('ðŸ” Fetching store data from Appwrite...');
            console.log('ðŸª Store ID:', storeId, 'â†’ Int:', merchantIdInt);
            
            const response = await fetch(url, { 
                method: 'GET',
                headers: { 
                    'X-Appwrite-Project': config.appwriteProjectId,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.log('âš ï¸ Appwrite response not OK:', response.status);
                return null;
            }
            const data = await response.json();
            console.log('ðŸ“¦ Appwrite response:', data);
            
            // Parse data from 'notes' field (where we store the JSON)
            if (data.documents?.[0]?.notes) {
                try {
                    const cachedData = JSON.parse(data.documents[0].notes);
                    console.log('ðŸ“¦ Cached data:', cachedData);
                    return {
                        storeName: cachedData.store || cachedData.storeName || 'Ù…ØªØ¬Ø±',
                        accessToken: cachedData.token || cachedData.accessToken,
                        // Products might not be cached in notes due to size limit
                        cachedProducts: '[]',
                        cachedShipping: '[]',
                        cachedCoupons: '[]',
                        cachedOffers: '[]'
                    };
                } catch (e) {
                    console.log('âš ï¸ Could not parse notes:', e.message);
                }
            }
            
            return data.documents?.[0];
        } catch (e) {
            console.log('âš ï¸ Could not fetch from Appwrite (CORS):', e.message);
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
                    console.log('ðŸ“¦ Found products with selector:', selector, found.length);
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
                    console.log('ðŸ“¦ Found product:', name, price);
                }
            });

            if (products.length > 0) {
                console.log('ðŸ“¦ Found', products.length, 'products from page');
                return {
                    storeName: document.title?.split('|')[0]?.trim() || 'Ø§Ù„Ù…ØªØ¬Ø±',
                    cachedProducts: JSON.stringify(products),
                    cachedShipping: '[]',
                    cachedCoupons: '[]',
                    cachedOffers: '[]'
                };
            }
            
            return null;
        } catch (e) {
            console.log('âš ï¸ Could not extract products from page:', e.message);
            return null;
        }
    }

    // Build dynamic system prompt with real store data
    function buildSystemPrompt() {
        // Debug: Log what products we have
        console.log('ðŸ¤– Building prompt with', storeData.products.length, 'products');
        if (storeData.products.length > 0) {
            console.log('ðŸ“‹ First 5 products:', storeData.products.slice(0, 5).map(p => `${p.name}: ${p.price}`));
        }
        
        // Products section - include ALL products (up to 50)
        let productList = '';
        console.log('ðŸ“¦ Products available for prompt:', storeData.products.length);
        console.log('ðŸ“‹ Product names:', storeData.products.map(p => p.name));
        
        if (storeData.products.length > 0) {
            productList = storeData.products.slice(0, 50).map((p, i) => {
                let priceText = `${p.price} ${p.currency || 'Ø±ÙŠØ§Ù„'}`;
                if (p.salePrice && p.salePrice < p.price) {
                    priceText = `${p.salePrice} Ø±ÙŠØ§Ù„ (Ø¨Ø¯Ù„ ${p.price})`;
                }
                const stockStatus = p.inStock !== false ? 'âœ“' : '(Ù†ÙØ°)';
                return `${i+1}. ${p.name} - ${priceText} ${stockStatus}`;
            }).join('\n');
        } else {
            productList = `(Ù…Ù†ØªØ¬Ø§Øª ØªØ¬Ø±ÙŠØ¨ÙŠØ© - Ù„Ù… ÙŠØªÙ… ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…ØªØ¬Ø±)
1. ÙØ³ØªØ§Ù† Ø³Ù‡Ø±Ø© Ø£Ø³ÙˆØ¯ Ø£Ù†ÙŠÙ‚ - 450 Ø±ÙŠØ§Ù„
2. Ø¹Ø¨Ø§ÙŠØ© Ù…Ø·Ø±Ø²Ø© ÙØ§Ø®Ø±Ø© - 850 Ø±ÙŠØ§Ù„
3. Ø¨Ù„ÙˆØ²Ø© Ù‚Ø·Ù† ÙƒØ§Ø¬ÙˆØ§Ù„ - 120 Ø±ÙŠØ§Ù„
4. Ø¬Ø§ÙƒÙŠØª Ø¬ÙŠÙ†Ø² Ù†Ø³Ø§Ø¦ÙŠ - 280 Ø±ÙŠØ§Ù„
5. ØªÙ†ÙˆØ±Ø© Ù…ÙŠØ¯ÙŠ Ø¨Ù„ÙŠØ³ÙŠÙ‡ - 180 Ø±ÙŠØ§Ù„
6. Ø·Ù‚Ù… Ø¨ÙŠØ¬Ø§Ù…Ø§ Ø­Ø±ÙŠØ± - 320 Ø±ÙŠØ§Ù„`;
        }

        // Shipping section
        let shippingInfo = '';
        if (storeData.shipping.length > 0) {
            shippingInfo = storeData.shipping.map(s => {
                let text = `- ${s.name}`;
                if (s.methods && s.methods.length > 0) {
                    text += ': ' + s.methods.map(m => `${m.name} (${m.cost} Ø±ÙŠØ§Ù„)`).join(', ');
                }
                if (s.countries && s.countries.length > 0) {
                    text += ` [${s.countries.join(', ')}]`;
                }
                return text;
            }).join('\n');
        } else {
            shippingInfo = `- Ø¯Ø§Ø®Ù„ Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©: 25 Ø±ÙŠØ§Ù„ (Ù…Ø¬Ø§Ù†ÙŠ ÙÙˆÙ‚ 200 Ø±ÙŠØ§Ù„) - 2-5 Ø£ÙŠØ§Ù…`;
        }

        // Coupons section
        let couponsInfo = '';
        if (storeData.coupons.length > 0) {
            couponsInfo = storeData.coupons.map(c => {
                const discountText = c.type === 'percentage' ? `Ø®ØµÙ… ${c.discount}%` : `Ø®ØµÙ… ${c.discount} Ø±ÙŠØ§Ù„`;
                return `- ÙƒÙˆØ¯ "${c.code}": ${discountText}`;
            }).join('\n');
        } else {
            couponsInfo = '- Ù„Ø§ ÙŠÙˆØ¬Ø¯ ÙƒÙˆØ¨ÙˆÙ†Ø§Øª Ù†Ø´Ø·Ø© Ø­Ø§Ù„ÙŠØ§Ù‹';
        }

        // Offers section
        let offersInfo = '';
        if (storeData.offers.length > 0) {
            offersInfo = storeData.offers.map(o => {
                let text = `- ${o.name}`;
                if (o.discount) text += ` (Ø®ØµÙ… ${o.discount}%)`;
                return text;
            }).join('\n');
        } else {
            offersInfo = '- Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¹Ø±ÙˆØ¶ Ø®Ø§ØµØ© Ø­Ø§Ù„ÙŠØ§Ù‹';
        }

        // English system prompt
        if (!isRTL) {
            let productListEn = '';
            if (storeData.products.length > 0) {
                productListEn = storeData.products.slice(0, 50).map((p, i) => {
                    let priceText = `${p.price} SAR`;
                    if (p.salePrice && p.salePrice < p.price) {
                        priceText = `${p.salePrice} SAR (was ${p.price})`;
                    }
                    const stockStatus = p.inStock !== false ? 'âœ“' : '(out of stock)';
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

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“¦ Available Products:
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${productListEn}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸšš Shipping & Delivery:
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${shippingInfoEn}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ·ï¸ Active Discount Codes:
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${couponsInfoEn}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸŽ‰ Special Offers:
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${offersInfoEn}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ’³ Payment Methods: Mada, Visa, Mastercard, Apple Pay, Tabby
ðŸ”„ Returns: Within 14 days of receiving the order

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“ž Customer Support:
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${storeData.supportContact || 'Contact info available on the website'}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
Response Rules (IMPORTANT - Follow Exactly):
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸ”´ RULE 1 (MOST IMPORTANT):
The ONLY products available are listed above. There are NO other products.

ðŸ”´ RULE 2:
If customer asks about a product NOT in the list above, say exactly:
"Sorry, we don't have [product name] currently ðŸ˜”"

ðŸ”´ Products we DON'T have (say NO to these):
- Shoes âŒ NOT available
- Glasses âŒ NOT available
- Pants âŒ NOT available
- Phone âŒ NOT available
- TV âŒ NOT available
- Furniture âŒ NOT available

ðŸ”´ RULE 3:
Before saying "yes we have" - search the list above. If you don't find the exact product, say "we don't have".

ðŸŸ¢ Response style:
- Be friendly and brief
- Do NOT add any URLs`;
        }

        // Arabic system prompt (default)
        return `Ø£Ù†Øª Ø¹Ù„Ø§Ù…ØŒ Ù…Ø³Ø§Ø¹Ø¯ Ø°ÙƒÙŠ Ù„Ù€ "${storeData.storeName}". ØªØªØ­Ø¯Ø« Ø¨Ø§Ù„Ù„Ù‡Ø¬Ø© Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ© ÙÙ‚Ø·.

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“¦ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ù…ØªÙˆÙØ±Ø© (Ù‡Ø°Ù‡ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ÙƒØ§Ù…Ù„Ø©):
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${productList}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸšš Ø§Ù„Ø´Ø­Ù† ÙˆØ§Ù„ØªÙˆØµÙŠÙ„:
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${shippingInfo}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ·ï¸ ÙƒÙˆØ¨ÙˆÙ†Ø§Øª Ø§Ù„Ø®ØµÙ… Ø§Ù„Ù†Ø´Ø·Ø©:
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${couponsInfo}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸŽ‰ Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ø®Ø§ØµØ©:
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${offersInfo}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ’³ Ø·Ø±Ù‚ Ø§Ù„Ø¯ÙØ¹: Ù…Ø¯Ù‰ØŒ ÙÙŠØ²Ø§ØŒ Ù…Ø§Ø³ØªØ±ÙƒØ§Ø±Ø¯ØŒ Ø£Ø¨Ù„ Ø¨Ø§ÙŠØŒ ØªØ§Ø¨ÙŠ
ðŸ”„ Ø§Ù„Ø§Ø³ØªØ±Ø¬Ø§Ø¹: Ø®Ù„Ø§Ù„ 14 ÙŠÙˆÙ… Ù…Ù† Ø§Ù„Ø§Ø³ØªÙ„Ø§Ù…

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
ðŸ“ž Ø§Ù„ØªÙˆØ§ØµÙ„ ÙˆØ§Ù„Ø¯Ø¹Ù…:
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
${storeData.supportContact || 'Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØªÙˆØ§ØµÙ„ Ù…ÙˆØ¬ÙˆØ¯Ø© ÙÙŠ Ø§Ù„Ù…ÙˆÙ‚Ø¹'}

â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
âš ï¸ Ù‚ÙˆØ§Ø¹Ø¯ ØµØ§Ø±Ù…Ø© Ø¬Ø¯Ø§Ù‹ - Ø§ØªØ¨Ø¹Ù‡Ø§ Ø¨Ø¯Ù‚Ø©:
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

ðŸ”´ Ù‚Ø§Ø¹Ø¯Ø© Ø±Ù‚Ù… 1 (Ø§Ù„Ø£Ù‡Ù…): 
Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© ÙÙ‚Ø· Ù‡ÙŠ Ø§Ù„Ù…Ø°ÙƒÙˆØ±Ø© Ø£Ø¹Ù„Ø§Ù‡. Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø£ÙŠ Ù…Ù†ØªØ¬ Ø¢Ø®Ø± ÙÙŠ Ø§Ù„Ù…ØªØ¬Ø±.

ðŸ”´ Ù‚Ø§Ø¹Ø¯Ø© Ø±Ù‚Ù… 2:
Ø¥Ø°Ø§ Ø³Ø£Ù„ Ø§Ù„Ø¹Ù…ÙŠÙ„ Ø¹Ù† Ù…Ù†ØªØ¬ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯ ÙÙŠ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø£Ø¹Ù„Ø§Ù‡ØŒ Ù‚Ù„ Ø¨Ø§Ù„Ø¶Ø¨Ø·:
"Ù„Ù„Ø£Ø³Ù Ù…Ø§ Ø¹Ù†Ø¯Ù†Ø§ [Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬] Ø­Ø§Ù„ÙŠØ§Ù‹ ðŸ˜”"

ðŸ”´ Ù…Ù†ØªØ¬Ø§Øª ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø© (Ù‚Ù„ Ù„Ø§ Ù„Ù‡Ø°Ù‡ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª):
- Ø£Ø­Ø°ÙŠØ© âŒ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©
- Ù†Ø¸Ø§Ø±Ø§Øª âŒ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©  
- Ø¨Ù†Ø·Ù„ÙˆÙ† âŒ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯
- Ø¬ÙˆØ§Ù„ âŒ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯
- ØªÙ„ÙØ²ÙŠÙˆÙ† âŒ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯
- Ø£Ø«Ø§Ø« âŒ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯

ðŸ”´ Ù‚Ø§Ø¹Ø¯Ø© Ø±Ù‚Ù… 3:
Ù‚Ø¨Ù„ Ù…Ø§ ØªÙ‚ÙˆÙ„ "Ù†Ø¹Ù… Ø¹Ù†Ø¯Ù†Ø§" - Ø§Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ù‚Ø§Ø¦Ù…Ø© Ø£Ø¹Ù„Ø§Ù‡. Ø¥Ø°Ø§ Ù…Ø§ Ù„Ù‚ÙŠØª Ø§Ù„Ù…Ù†ØªØ¬ Ø¨Ø§Ù„Ø¶Ø¨Ø·ØŒ Ù‚Ù„ "Ù…Ø§ Ø¹Ù†Ø¯Ù†Ø§".

ðŸŸ¢ Ø£Ø³Ù„ÙˆØ¨ Ø§Ù„Ø±Ø¯:
- Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ù„Ù‡Ø¬Ø© Ø§Ù„Ø³Ø¹ÙˆØ¯ÙŠØ©
- ÙƒÙ† Ù…Ø®ØªØµØ± ÙˆÙˆØ¯ÙˆØ¯
- Ù„Ø§ ØªØ¶ÙŠÙ Ø±ÙˆØ§Ø¨Ø·`;
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
                ðŸ’¬
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
                        ">${currentLang === 'ar' ? 'EN' : 'Ø¹Ø±Ø¨ÙŠ'}</button>
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
                        ">Ã—</button>
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
                console.log('ðŸ”„ Refreshed products:', freshProducts.length);
                console.log('ðŸ“‹ Product names:', freshProducts.map(p => p.name).join(' | '));
            } else {
                console.log('âš ï¸ NO PRODUCTS FOUND! Check scraping selectors');
            }
        });

        // Send welcome message (use translated version)
        addMessage(t.welcome, 'bot');

        console.log('âœ… AI Chatbot Widget loaded!');
        console.log('ðŸ“ Store ID:', storeId);
        console.log('ðŸŒ Language:', currentLang);
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

        // Clear conversation history after 3 exchanges to keep AI fresh
        // (3 user messages + 3 assistant messages = 6 items)
        if (conversationHistory.length > 6) {
            console.log('ðŸ”„ Clearing conversation history to keep AI accurate');
            conversationHistory = [];
        }

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

    // ===== STRICT PRODUCT VERIFICATION ALGORITHM =====
    // Checks ALL products before responding - prevents AI hallucination
    function verifyProductQuestion(message) {
        const msg = message.toLowerCase();
        
        // Log all available products for debugging
        console.log('ðŸ“¦ All products in store:', storeData.products.map(p => p.name));
        
        // Common product keywords to detect (what user might ask for)
        const productKeywords = [
            // Arabic - Clothing
            'Ø¬Ø§ÙƒÙŠØª', 'Ø¬Ø§ÙƒÙŠØªØ§Øª', 'ÙØ³ØªØ§Ù†', 'ÙØ³Ø§ØªÙŠÙ†', 'Ø¨Ù„ÙˆØ²Ø©', 'Ø¨Ù„ÙˆØ²Ø§Øª', 'Ø¨Ù„Ø§ÙŠØ²',
            'Ø¹Ø¨Ø§ÙŠØ©', 'Ø¹Ø¨Ø§ÙŠØ§Øª', 'ØªÙ†ÙˆØ±Ø©', 'ØªÙ†Ø§Ù†ÙŠØ±', 'Ø¨Ù†Ø·Ù„ÙˆÙ†', 'Ø¨Ù†Ø·Ø§Ù„', 'Ø¨Ù†Ø§Ø·ÙŠÙ„',
            'Ù‚Ù…ÙŠØµ', 'Ù‚Ù…ØµØ§Ù†', 'Ø´ÙˆØ±Øª', 'Ø¨ÙŠØ¬Ø§Ù…Ø§',
            // Arabic - Accessories
            'Ø´Ù†Ø·Ø©', 'Ø´Ù†Ø·', 'Ø­Ù‚ÙŠØ¨Ø©', 'Ø­Ù‚Ø§Ø¦Ø¨', 'Ø³Ø§Ø¹Ø©', 'Ø³Ø§Ø¹Ø§Øª', 'Ù†Ø¸Ø§Ø±Ø©', 'Ù†Ø¸Ø§Ø±Ø§Øª',
            'Ø®Ø§ØªÙ…', 'Ø®ÙˆØ§ØªÙ…', 'Ø³Ù„Ø³Ù„Ø©', 'Ø³Ù„Ø§Ø³Ù„', 'Ø§Ø³ÙˆØ§Ø±Ø©', 'Ø£Ø³Ø§ÙˆØ±', 'Ù‚Ù„Ø§Ø¯Ø©', 'Ø§Ù‚Ø±Ø§Ø·', 'Ø£Ù‚Ø±Ø§Ø·',
            'Ø¨Ø±ÙˆØ´', 'Ø­Ø²Ø§Ù…', 'Ø§Ø­Ø²Ù…Ø©',
            // Arabic - Shoes
            'Ø­Ø°Ø§Ø¡', 'Ø£Ø­Ø°ÙŠØ©', 'Ø§Ø­Ø°ÙŠØ©', 'ØµÙ†Ø¯Ù„', 'ÙƒØ¹Ø¨', 'Ø±ÙŠØ§Ø¶ÙŠ',
            // Arabic - Head covers
            'Ø·Ø±Ø­Ø©', 'Ø·Ø±Ø­', 'Ø´Ø§Ù„', 'Ø´ÙŠÙ„Ø©', 'Ø´ÙŠÙ„Ø§Øª', 'Ø­Ø¬Ø§Ø¨',
            // Arabic - Beauty
            'Ø¹Ø·Ø±', 'Ø¹Ø·ÙˆØ±', 'Ø¨Ø®ÙˆØ±', 'Ù…ÙƒÙŠØ§Ø¬', 'Ø±ÙˆØ¬', 'ÙƒØ±ÙŠÙ…', 'Ø³ÙŠØ±ÙˆÙ…', 'Ù…Ø§Ø³Ùƒ', 'ØºØ³ÙˆÙ„',
            'Ù‡Ø§ÙŠÙ„Ø§ÙŠØªØ±', 'Ø¨Ø§Ù„ÙŠØª', 'ÙØ±Ø´', 'Ø·Ù„Ø§Ø¡',
            // Arabic - Electronics (usually NOT in fashion stores)
            'Ø¬ÙˆØ§Ù„', 'Ø¬ÙˆØ§Ù„Ø§Øª', 'Ù„Ø§Ø¨ØªÙˆØ¨', 'ÙƒÙ…Ø¨ÙŠÙˆØªØ±', 'ØªÙ„ÙØ²ÙŠÙˆÙ†', 'Ø³Ù…Ø§Ø¹Ø©', 'Ø³Ù…Ø§Ø¹Ø§Øª',
            // Arabic - Other
            'Ø£Ø«Ø§Ø«', 'Ø³ÙŠØ§Ø±Ø©', 'Ø¯Ø±Ø§Ø¬Ø©', 'ÙƒØªØ§Ø¨', 'Ù„Ø¹Ø¨Ø©',
            // English
            'jacket', 'dress', 'blouse', 'abaya', 'skirt', 'pants', 'shirt',
            'bag', 'shoe', 'shoes', 'watch', 'ring', 'necklace', 'bracelet',
            'perfume', 'makeup', 'cream', 'serum',
            'phone', 'laptop', 'tv', 'headphone',
            'furniture', 'car', 'book', 'toy'
        ];
        
        // Find which keyword user is asking about
        let askedKeyword = null;
        for (const keyword of productKeywords) {
            if (msg.includes(keyword)) {
                askedKeyword = keyword;
                break;
            }
        }
        
        // If no known keyword found, let AI handle it
        if (!askedKeyword) {
            console.log('ðŸ” No product keyword detected, letting AI handle');
            return { verified: true, productAsked: null };
        }
        
        console.log('ðŸ” User asking about:', askedKeyword);
        
        // NOW CHECK: Does this keyword exist in ANY of our actual products?
        const allProductText = storeData.products.map(p => p.name.toLowerCase()).join(' ');
        
        // Check if the keyword appears in any product name
        const keywordInProducts = allProductText.includes(askedKeyword);
        
        // Also check for partial matches (e.g., "ÙØ³Ø§ØªÙŠÙ†" should match "ÙØ³ØªØ§Ù†")
        const keywordVariants = {
            // Arabic - Clothing plurals to singular
            'ÙØ³Ø§ØªÙŠÙ†': 'ÙØ³ØªØ§Ù†', 'ÙØ³ØªØ§Ù†': 'ÙØ³ØªØ§Ù†',
            'Ø¨Ù„ÙˆØ²Ø§Øª': 'Ø¨Ù„ÙˆØ²Ø©', 'Ø¨Ù„Ø§ÙŠØ²': 'Ø¨Ù„ÙˆØ²Ø©', 'Ø¨Ù„ÙˆØ²Ø©': 'Ø¨Ù„ÙˆØ²Ø©',
            'Ø¬Ø§ÙƒÙŠØªØ§Øª': 'Ø¬Ø§ÙƒÙŠØª', 'Ø¬Ø§ÙƒÙŠØª': 'Ø¬Ø§ÙƒÙŠØª',
            'Ø¹Ø¨Ø§ÙŠØ§Øª': 'Ø¹Ø¨Ø§ÙŠØ©', 'Ø¹Ø¨Ø§ÙŠØ©': 'Ø¹Ø¨Ø§ÙŠØ©',
            'ØªÙ†Ø§Ù†ÙŠØ±': 'ØªÙ†ÙˆØ±Ø©', 'ØªÙ†ÙˆØ±Ø©': 'ØªÙ†ÙˆØ±Ø©',
            'Ø¨Ù†Ø§Ø·ÙŠÙ„': 'Ø¨Ù†Ø·Ù„ÙˆÙ†', 'Ø¨Ù†Ø·Ø§Ù„': 'Ø¨Ù†Ø·Ù„ÙˆÙ†', 'Ø¨Ù†Ø·Ù„ÙˆÙ†': 'Ø¨Ù†Ø·Ù„ÙˆÙ†',
            'Ù‚Ù…ØµØ§Ù†': 'Ù‚Ù…ÙŠØµ', 'Ù‚Ù…ÙŠØµ': 'Ù‚Ù…ÙŠØµ',
            // Arabic - Bags
            'Ø´Ù†Ø·': 'Ø­Ù‚ÙŠØ¨Ø©', 'Ø´Ù†Ø·Ø©': 'Ø­Ù‚ÙŠØ¨Ø©', 'Ø­Ù‚Ø§Ø¦Ø¨': 'Ø­Ù‚ÙŠØ¨Ø©', 'Ø­Ù‚ÙŠØ¨Ø©': 'Ø­Ù‚ÙŠØ¨Ø©',
            // Arabic - Shoes
            'Ø£Ø­Ø°ÙŠØ©': 'Ø­Ø°Ø§Ø¡', 'Ø§Ø­Ø°ÙŠØ©': 'Ø­Ø°Ø§Ø¡', 'Ø­Ø°Ø§Ø¡': 'Ø­Ø°Ø§Ø¡',
            // Arabic - Watches
            'Ø³Ø§Ø¹Ø§Øª': 'Ø³Ø§Ø¹Ø©', 'Ø³Ø§Ø¹Ø©': 'Ø³Ø§Ø¹Ø©',
            // Arabic - Accessories
            'Ø®ÙˆØ§ØªÙ…': 'Ø®Ø§ØªÙ…', 'Ø®Ø§ØªÙ…': 'Ø®Ø§ØªÙ…',
            'Ø³Ù„Ø§Ø³Ù„': 'Ø³Ù„Ø³Ù„Ø©', 'Ø³Ù„Ø³Ù„Ø©': 'Ø³Ù„Ø³Ù„Ø©',
            'Ø£Ø³Ø§ÙˆØ±': 'Ø§Ø³ÙˆØ§Ø±Ø©', 'Ø§Ø³ÙˆØ§Ø±Ø©': 'Ø§Ø³ÙˆØ§Ø±Ø©',
            'Ø£Ù‚Ø±Ø§Ø·': 'Ø§Ù‚Ø±Ø§Ø·', 'Ø§Ù‚Ø±Ø§Ø·': 'Ø§Ù‚Ø±Ø§Ø·',
            'Ù†Ø¸Ø§Ø±Ø§Øª': 'Ù†Ø¸Ø§Ø±Ø©', 'Ù†Ø¸Ø§Ø±Ø©': 'Ù†Ø¸Ø§Ø±Ø©',
            // Arabic - Head covers
            'Ø´ÙŠÙ„Ø§Øª': 'Ø´ÙŠÙ„Ø©', 'Ø´ÙŠÙ„Ø©': 'Ø´ÙŠÙ„Ø©',
            'Ø·Ø±Ø­': 'Ø·Ø±Ø­Ø©', 'Ø·Ø±Ø­Ø©': 'Ø·Ø±Ø­Ø©',
            // Arabic - Perfume
            'Ø¹Ø·ÙˆØ±': 'Ø¹Ø·Ø±', 'Ø¹Ø·Ø±': 'Ø¹Ø·Ø±',
            // English plurals
            'dresses': 'dress', 'dress': 'dress',
            'blouses': 'blouse', 'blouse': 'blouse',
            'jackets': 'jacket', 'jacket': 'jacket',
            'bags': 'bag', 'bag': 'bag',
            'shoes': 'shoe', 'shoe': 'shoe',
            'watches': 'watch', 'watch': 'watch',
            'rings': 'ring', 'ring': 'ring',
            'perfumes': 'perfume', 'perfume': 'perfume'
        };
        
        const normalizedKeyword = keywordVariants[askedKeyword] || askedKeyword;
        const hasProduct = allProductText.includes(normalizedKeyword) || allProductText.includes(askedKeyword);
        
        console.log('ðŸ” Checking if "' + askedKeyword + '" exists in products...');
        console.log('ðŸ” All product names:', allProductText.substring(0, 200));
        console.log('ðŸ” Result:', hasProduct ? 'âœ… FOUND' : 'âŒ NOT FOUND');
        
        DEBUG_LOG.add('PRODUCT_VERIFICATION', {
            userMessage: message,
            askedKeyword: askedKeyword,
            normalizedKeyword: normalizedKeyword,
            foundInProducts: hasProduct,
            allProductNames: storeData.products.map(p => p.name),
            productCount: storeData.products.length
        });
        
        if (!hasProduct) {
            // PRODUCT DOES NOT EXIST - Return immediate response
            const availableTypes = [...new Set(storeData.products.map(p => p.name.split(' ')[0]))]
                .slice(0, 5)
                .join('ØŒ ');
            
            console.log('ðŸš« Product NOT found, returning "we dont have it"');
            
            return {
                verified: false,
                productAsked: askedKeyword,
                response: isRTL 
                    ? `Ù„Ù„Ø£Ø³Ù Ù…Ø§ Ø¹Ù†Ø¯Ù†Ø§ ${askedKeyword} Ø­Ø§Ù„ÙŠØ§Ù‹ ðŸ˜”\nØ¨Ø³ Ø¹Ù†Ø¯Ù†Ø§: ${availableTypes}\nØªØ¨ÙŠ ØªØ´ÙˆÙ Ø´ÙŠ Ù…Ù†Ù‡Ù…ØŸ`
                    : `Sorry, we don't have ${askedKeyword} right now ðŸ˜”\nBut we have: ${availableTypes}\nWould you like to see any of these?`
            };
        }
        
        // Product EXISTS - find matching products for AI
        const matchingProducts = storeData.products.filter(p => 
            p.name.toLowerCase().includes(normalizedKeyword) || 
            p.name.toLowerCase().includes(askedKeyword)
        );
        
        console.log('âœ… Product FOUND, passing to AI with', matchingProducts.length, 'matches');
        
        return { 
            verified: true, 
            productAsked: askedKeyword,
            matchingProducts: matchingProducts
        };
    }

    async function callAI(message) {
        // Direct AI call - no pre-check algorithm, let AI handle everything
        const systemPrompt = buildSystemPrompt();
        
        console.log('ðŸ¤– Calling AI with', storeData.products.length, 'products in context');
        console.log('ðŸ“ User message:', message);
        
        
        // Log the full request
        DEBUG_LOG.add('AI_REQUEST', {
            userMessage: message,
            
            productsInContext: storeData.products.length,
            productsList: storeData.products.slice(0, 50).map(p => `${p.name}: ${p.price} ${p.currency}`),
            systemPromptPreview: systemPrompt.substring(0, 500) + '...'
        });

        try {
            let config.aiUrl, headers, model;
            
            if (config.aiProvider === 'groq' && '') {
                // Use Groq API (cloud, no tunnel needed)
                config.aiUrl = config.aiUrl;
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${''}`
                };
                model = config.aiModel;
                console.log('â˜ï¸ Using Groq Cloud API');
            } else {
                // Use local LM Studio via tunnel
                config.aiUrl = config.aiUrl;
                headers = {
                    'Content-Type': 'application/json'
                };
                model = config.aiModel;
                console.log('ðŸ–¥ï¸ Using Local LM Studio');
            }
            
            const response = await fetch(config.aiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    model: config.aiModel,
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
            
            console.log('âœ… AI Response received:', aiResponse.substring(0, 100));
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
                return 'Hello! How can I help you today? ðŸ˜Š';
            }
            if (lower.includes('price') || lower.includes('cost') || lower.includes('how much')) {
                return 'Sure! Tell me the product name and I\'ll give you the price ðŸ·ï¸';
            }
            if (lower.includes('ship') || lower.includes('delivery') || lower.includes('deliver')) {
                return 'Shipping usually takes 2-5 days ðŸšš';
            }
            if (lower.includes('thank')) {
                return 'You\'re welcome! Happy to help ðŸ˜Š';
            }
            return 'Sure! What exactly would you like to know?';
        }
        
        // Arabic patterns (default)
        if (lower.includes('Ù‡Ù„Ø§') || lower.includes('Ø§Ù„Ø³Ù„Ø§Ù…') || lower.includes('Ù…Ø±Ø­Ø¨Ø§')) {
            return 'Ù‡Ù„Ø§ ÙˆØ§Ù„Ù„Ù‡! ÙˆØ´ Ø£Ù‚Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯Ùƒ ÙÙŠÙ‡ØŸ ðŸ˜Š';
        }
        if (lower.includes('Ø³Ø¹Ø±') || lower.includes('ÙƒÙ…') || lower.includes('Ø¨ÙƒÙ…')) {
            return 'Ø£Ø¨Ø´Ø±! Ù‚ÙˆÙ„ Ù„ÙŠ Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬ ÙˆØ£Ø¹Ø·ÙŠÙƒ Ø§Ù„Ø³Ø¹Ø± ðŸ·ï¸';
        }
        if (lower.includes('Ø´Ø­Ù†') || lower.includes('ØªÙˆØµÙŠÙ„')) {
            return 'Ø§Ù„Ø´Ø­Ù† ÙŠÙˆØµÙ„ Ø®Ù„Ø§Ù„ Ù¢-Ù¥ Ø£ÙŠØ§Ù… Ø¹Ø§Ø¯Ø© ðŸšš';
        }
        if (lower.includes('Ø´ÙƒØ±') || lower.includes('Ù…Ø´ÙƒÙˆØ±')) {
            return 'Ø§Ù„Ø¹ÙÙˆ! ÙŠØ³Ø¹Ø¯Ù†ÙŠ Ø£Ø®Ø¯Ù…Ùƒ ðŸ˜Š';
        }
        
        return 'Ø£Ø¨Ø´Ø±! ÙˆØ´ ØªØ¨ÙŠ ØªØ¹Ø±Ù Ø¨Ø§Ù„Ø¶Ø¨Ø·ØŸ';
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
            <span style="animation: bounce 1s infinite; animation-delay: 0s;">â—</span>
            <span style="animation: bounce 1s infinite; animation-delay: 0.2s;">â—</span>
            <span style="animation: bounce 1s infinite; animation-delay: 0.4s;">â—</span>
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

