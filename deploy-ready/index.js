// Appwrite Function: Salla Webhook Handler (Easy Mode)
// CommonJS format - works with Appwrite Node runtime

const { Client, Databases, ID, Query } = require('node-appwrite');

// Configuration
const DATABASE_ID = '6946699d001194236820';
const COLLECTION_ID = 'store_connections';
const PRODUCTS_COLLECTION_ID = 'products'; // NEW: Products collection
const WIDGET_URL = 'https://cdn.jsdelivr.net/gh/ahmed837363/chatbot3@v2.1/chatbot-widget.js';

module.exports = async ({ req, res, log, error }) => {
  log('📨 Request received: ' + req.method);

  // Handle GET (status check)
  if (req.method === 'GET') {
    log('✅ Status check - endpoint ready');
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>AI Smart Assistant</title></head>
      <body style="font-family:Arial;text-align:center;padding:50px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;min-height:100vh;margin:0;">
        <h1>🤖 AI Smart Assistant - علام</h1>
        <p style="font-size:1.2em;">✅ Webhook endpoint is ready!</p>
        <p style="opacity:0.7;">Easy Mode - Waiting for Salla events...</p>
      </body>
      </html>
    `, 200, { 'Content-Type': 'text/html; charset=utf-8' });
  }

  // Handle POST (webhooks)
  if (req.method === 'POST') {
    let payload;
    
    try {
      if (typeof req.body === 'string') {
        payload = JSON.parse(req.body);
      } else if (req.body) {
        payload = req.body;
      } else {
        log('⚠️ Empty body received');
        return res.json({ success: false, error: 'Empty body' }, 400);
      }
    } catch (e) {
      log('❌ JSON parse error: ' + e.message);
      return res.json({ success: false, error: 'Invalid JSON' }, 400);
    }

    const eventType = payload.event || 'unknown';
    log('📩 Event type: ' + eventType);

    // Get merchant ID
    let merchantId = 'unknown';
    if (payload.merchant && payload.merchant.id) {
      merchantId = String(payload.merchant.id);
    } else if (payload.data && payload.data.merchant && payload.data.merchant.id) {
      merchantId = String(payload.data.merchant.id);
    } else if (payload.data && payload.data.store && payload.data.store.id) {
      merchantId = String(payload.data.store.id);
    } else if (payload.merchant) {
      merchantId = String(payload.merchant);
    }
    
    log('🏪 Merchant ID: ' + merchantId);

    // Initialize Appwrite
    let databases;
    try {
      const client = new Client()
        .setEndpoint('https://fra.cloud.appwrite.io/v1')
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);
      
      databases = new Databases(client);
      log('✅ Appwrite client initialized');
    } catch (e) {
      log('❌ Appwrite init failed: ' + e.message);
      return res.json({ success: false, error: 'Database connection failed' }, 500);
    }

    // =============================================
    // EVENT: app.store.authorize (Easy Mode)
    // =============================================
    if (eventType === 'app.store.authorize') {
      log('🔐 Processing app.store.authorize event');
      
      const accessToken = payload.data?.access_token || payload.access_token;
      
      if (!accessToken) {
        log('❌ No access token in payload');
        return res.json({ success: false, error: 'No access token' }, 400);
      }
      
      log('✅ Access token received: ' + accessToken.substring(0, 15) + '...');

      // Fetch store info
      let storeName = 'متجر';
      let products = [];
      
      try {
        const storeResp = await fetch('https://api.salla.dev/admin/v2/store/info', {
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        if (storeResp.ok) {
          const storeData = await storeResp.json();
          storeName = storeData.data?.name || storeData.data?.store_name || 'متجر';
          log('🏪 Store name: ' + storeName);
        }
      } catch (e) {
        log('⚠️ Store info error: ' + e.message);
      }

      // Fetch products - get more details for database
      let rawProducts = [];
      try {
        const productsResp = await fetch('https://api.salla.dev/admin/v2/products?per_page=50', {
          headers: { 'Authorization': 'Bearer ' + accessToken }
        });
        if (productsResp.ok) {
          const productsData = await productsResp.json();
          if (productsData.data && Array.isArray(productsData.data)) {
            rawProducts = productsData.data;
            products = rawProducts.map(p => ({
              name: p.name,
              price: p.price?.amount || p.price
            }));
          }
          log('📦 Products fetched: ' + products.length);
        }
      } catch (e) {
        log('⚠️ Products error: ' + e.message);
      }

      // Save to Appwrite
      try {
        const merchantIdInt = parseInt(merchantId) || Date.now();
        const storeConnectionId = merchantIdInt;
        const now = new Date().toISOString();
        
        const notesData = JSON.stringify({
          store: storeName,
          token: accessToken.substring(0, 20) + '...',
          products: products.length,
          updated: now
        });

        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
          Query.equal('merchantId', merchantIdInt)
        ]);

        if (existing.documents.length > 0) {
          await databases.updateDocument(DATABASE_ID, COLLECTION_ID, existing.documents[0].$id, {
            connectionStatus: 'active',
            lastActivityDate: now,
            notes: notesData.substring(0, 255)
          });
          log('✅ Updated store: ' + merchantIdInt);
        } else {
          await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
            storeConnectionId: storeConnectionId,
            merchantId: merchantIdInt,
            connectionStatus: 'active',
            createdDate: now,
            lastActivityDate: now,
            notes: notesData.substring(0, 255)
          });
          log('✅ Created store: ' + merchantIdInt);
        }

        // =============================================
        // SAVE PRODUCTS TO PRODUCTS COLLECTION
        // =============================================
        log('📦 Saving products to database...');
        
        // First, delete old products for this store
        try {
          const oldProducts = await databases.listDocuments(DATABASE_ID, PRODUCTS_COLLECTION_ID, [
            Query.equal('storeId', merchantIdInt),
            Query.limit(100)
          ]);
          for (const doc of oldProducts.documents) {
            await databases.deleteDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, doc.$id);
          }
          log('🗑️ Deleted ' + oldProducts.documents.length + ' old products');
        } catch (e) {
          log('⚠️ Delete old products: ' + e.message);
        }

        // Save new products
        let savedCount = 0;
        for (const p of rawProducts) {
          try {
            await databases.createDocument(DATABASE_ID, PRODUCTS_COLLECTION_ID, ID.unique(), {
              storeId: merchantIdInt,
              name: (p.name || 'منتج').substring(0, 200),
              nameAr: (p.name || '').substring(0, 200),
              price: parseFloat(p.price?.amount || p.price || 0),
              salePrice: parseFloat(p.sale_price?.amount || p.sale_price || 0),
              currency: p.price?.currency || 'SAR',
              description: (p.description || '').substring(0, 1000),
              inStock: p.quantity === undefined ? true : p.quantity > 0,
              imageUrl: (p.image?.url || p.thumbnail || '').substring(0, 500)
            });
            savedCount++;
          } catch (e) {
            log('⚠️ Save product error: ' + e.message);
          }
        }
        log('✅ Saved ' + savedCount + ' products to database');

      } catch (e) {
        log('❌ Database error: ' + e.message);
      }

      // =============================================
      // INJECT WIDGET - Simple script tag that worked before
      // =============================================
      log('🤖 Injecting chatbot widget...');
      
      const widgetScript = '<script src="' + WIDGET_URL + '"></script>';
      let injected = false;

      // Try different injection methods
      const endpoints = [
        {
          url: 'https://api.salla.dev/admin/v2/store/settings',
          method: 'PATCH',
          body: { custom_code_footer: widgetScript }
        },
        {
          url: 'https://api.salla.dev/admin/v2/store',
          method: 'PATCH', 
          body: { custom_code: { footer: widgetScript } }
        },
        {
          url: 'https://api.salla.dev/admin/v2/customizations/scripts',
          method: 'POST',
          body: { location: 'footer', content: widgetScript, active: true }
        }
      ];

      for (const ep of endpoints) {
        try {
          log('🔄 Trying: ' + ep.url);
          const resp = await fetch(ep.url, {
            method: ep.method,
            headers: {
              'Authorization': 'Bearer ' + accessToken,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(ep.body)
          });
          
          if (resp.ok) {
            log('✅ Injected via ' + ep.url);
            injected = true;
            break;
          } else {
            log('⚠️ Failed: ' + resp.status);
          }
        } catch (e) {
          log('⚠️ Error: ' + e.message);
        }
      }

      if (!injected) {
        log('⚠️ Auto-injection failed. Manual code:');
        log(widgetScript);
      }

      log('🎉 Store connected!');
      return res.json({ success: true, store: storeName, products: products.length });
    }

    // EVENT: app.installed
    if (eventType === 'app.installed') {
      log('📱 App installed: ' + merchantId);
      return res.json({ success: true, message: 'Installed' });
    }

    // EVENT: app.uninstalled  
    if (eventType === 'app.uninstalled') {
      log('🗑️ App uninstalled: ' + merchantId);
      try {
        const merchantIdInt = parseInt(merchantId) || 0;
        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
          Query.equal('merchantId', merchantIdInt)
        ]);
        if (existing.documents.length > 0) {
          await databases.updateDocument(DATABASE_ID, COLLECTION_ID, existing.documents[0].$id, {
            connectionStatus: 'inactive'
          });
        }
      } catch (e) {
        log('⚠️ Uninstall error: ' + e.message);
      }
      return res.json({ success: true, message: 'Uninstalled' });
    }

    // Other events
    log('ℹ️ Event: ' + eventType);
    return res.json({ success: true, event: eventType });
  }

  return res.json({ error: 'Method not allowed' }, 405);
};
