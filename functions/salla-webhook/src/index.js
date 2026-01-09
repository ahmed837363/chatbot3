// Appwrite Function: Salla Webhook Handler (Easy Mode)
// Version: 2.0 - Clean, tested, working
// Handles app.store.authorize webhook to get tokens and cache store data

import { Client, Databases, ID, Query } from 'node-appwrite';

// Configuration
const DATABASE_ID = '6946699d001194236820';
const COLLECTION_ID = 'store_connections';

export default async ({ req, res, log, error }) => {
  log('📨 Request received: ' + req.method);
  
  // CORS headers for all responses
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  // Handle OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.send('', 200, headers);
  }

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
        <p style="opacity:0.7;">Waiting for Salla events...</p>
      </body>
      </html>
    `, 200, { 'Content-Type': 'text/html; charset=utf-8' });
  }

  // Handle POST (webhooks)
  if (req.method === 'POST') {
    let payload;
    
    // Parse body
    try {
      if (typeof req.body === 'string') {
        payload = JSON.parse(req.body);
      } else if (req.body) {
        payload = req.body;
      } else {
        log('⚠️ Empty body received');
        return res.json({ success: false, error: 'Empty body' }, 400, headers);
      }
    } catch (e) {
      log('❌ JSON parse error: ' + e.message);
      return res.json({ success: false, error: 'Invalid JSON' }, 400, headers);
    }

    const eventType = payload.event || 'unknown';
    log('📩 Event type: ' + eventType);
    log('📦 Payload: ' + JSON.stringify(payload).substring(0, 500));

    // Get merchant ID from various possible locations
    const merchantId = (
      payload.merchant?.id || 
      payload.data?.merchant?.id || 
      payload.data?.store?.id ||
      'unknown'
    ).toString();
    
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
      error('❌ Appwrite init failed: ' + e.message);
      return res.json({ success: false, error: 'Database connection failed' }, 500, headers);
    }

    // =============================================
    // EVENT: app.store.authorize (MAIN EVENT)
    // =============================================
    if (eventType === 'app.store.authorize') {
      log('🔐 Processing app.store.authorize event');
      
      // Get access token from payload
      const accessToken = payload.data?.access_token || payload.access_token;
      const refreshToken = payload.data?.refresh_token || payload.refresh_token || '';
      const expiresIn = payload.data?.expires_in || 14400;
      
      if (!accessToken) {
        error('❌ No access token in payload');
        log('📦 Full payload: ' + JSON.stringify(payload));
        return res.json({ success: false, error: 'No access token received' }, 400, headers);
      }
      
      log('✅ Access token received: ' + accessToken.substring(0, 15) + '...');

      // Fetch store info from Salla API
      let storeName = 'متجر';
      let products = [];
      let shipping = [];
      let coupons = [];
      let offers = [];

      try {
        log('📡 Fetching store info from Salla API...');
        const storeRes = await fetch('https://api.salla.dev/admin/v2/store/info', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const storeData = await storeRes.json();
        storeName = storeData.data?.name || 'متجر';
        log('✅ Store name: ' + storeName);
      } catch (e) {
        log('⚠️ Could not fetch store info: ' + e.message);
      }

      // Fetch products
      try {
        log('📡 Fetching products...');
        const productsRes = await fetch('https://api.salla.dev/admin/v2/products?per_page=50', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const productsData = await productsRes.json();
        products = (productsData.data || []).map(p => ({
          id: p.id,
          name: p.name,
          price: p.price?.amount || 0,
          salePrice: p.sale_price?.amount || null,
          currency: p.price?.currency || 'SAR',
          inStock: p.quantity === null || p.quantity > 0
        }));
        log('✅ Fetched ' + products.length + ' products');
      } catch (e) {
        log('⚠️ Could not fetch products: ' + e.message);
      }

      // Fetch shipping zones
      try {
        log('📡 Fetching shipping zones...');
        const shippingRes = await fetch('https://api.salla.dev/admin/v2/shipping/zones', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const shippingData = await shippingRes.json();
        shipping = (shippingData.data || []).map(z => ({
          id: z.id,
          name: z.name,
          countries: z.countries || []
        }));
        log('✅ Fetched ' + shipping.length + ' shipping zones');
      } catch (e) {
        log('⚠️ Could not fetch shipping: ' + e.message);
      }

      // Fetch coupons
      try {
        log('📡 Fetching coupons...');
        const couponsRes = await fetch('https://api.salla.dev/admin/v2/coupons?status=active', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const couponsData = await couponsRes.json();
        coupons = (couponsData.data || []).map(c => ({
          id: c.id,
          code: c.code,
          type: c.type,
          discount: c.amount || c.percentage
        }));
        log('✅ Fetched ' + coupons.length + ' coupons');
      } catch (e) {
        log('⚠️ Could not fetch coupons: ' + e.message);
      }

      // Fetch special offers
      try {
        log('📡 Fetching special offers...');
        const offersRes = await fetch('https://api.salla.dev/admin/v2/special-offers?status=active', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const offersData = await offersRes.json();
        offers = (offersData.data || []).map(o => ({
          id: o.id,
          name: o.name,
          discount: o.amount || o.percentage
        }));
        log('✅ Fetched ' + offers.length + ' offers');
      } catch (e) {
        log('⚠️ Could not fetch offers: ' + e.message);
      }

      // Check if store already exists
      let existingDoc = null;
      try {
        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
          Query.equal('merchantId', merchantId)
        ]);
        if (existing.documents.length > 0) {
          existingDoc = existing.documents[0];
          log('📋 Found existing store document: ' + existingDoc.$id);
        }
      } catch (e) {
        log('ℹ️ No existing store found or query error: ' + e.message);
      }

      // Prepare document data
      const storeDocument = {
        merchantId: merchantId,
        storeName: storeName,
        accessToken: accessToken,
        refreshToken: refreshToken,
        tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        cachedProducts: JSON.stringify(products),
        cachedShipping: JSON.stringify(shipping),
        cachedCoupons: JSON.stringify(coupons),
        cachedOffers: JSON.stringify(offers),
        cacheLastUpdated: new Date().toISOString(),
        isActive: true
      };

      // Save to database
      try {
        if (existingDoc) {
          await databases.updateDocument(DATABASE_ID, COLLECTION_ID, existingDoc.$id, storeDocument);
          log('✅ Updated existing store: ' + merchantId);
        } else {
          storeDocument.installedAt = new Date().toISOString();
          const newDoc = await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), storeDocument);
          log('✅ Created new store: ' + merchantId + ' (doc: ' + newDoc.$id + ')');
        }
      } catch (e) {
        error('❌ Database save failed: ' + e.message);
        return res.json({ success: false, error: 'Database save failed: ' + e.message }, 500, headers);
      }

      log('🎉 Store connected successfully!');
      return res.json({
        success: true,
        message: 'Store connected successfully!',
        storeName: storeName,
        productsCount: products.length,
        couponsCount: coupons.length
      }, 200, headers);
    }

    // =============================================
    // EVENT: app.installed
    // =============================================
    if (eventType === 'app.installed') {
      log('📱 App installed on store: ' + merchantId);
      return res.json({ success: true, message: 'App installed - waiting for authorization' }, 200, headers);
    }

    // =============================================
    // EVENT: app.uninstalled
    // =============================================
    if (eventType === 'app.uninstalled') {
      log('🗑️ App uninstalled from store: ' + merchantId);
      
      try {
        const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
          Query.equal('merchantId', merchantId)
        ]);
        if (existing.documents.length > 0) {
          await databases.updateDocument(DATABASE_ID, COLLECTION_ID, existing.documents[0].$id, {
            isActive: false
          });
          log('✅ Marked store as inactive');
        }
      } catch (e) {
        log('⚠️ Could not update store: ' + e.message);
      }
      
      return res.json({ success: true, message: 'Store marked as inactive' }, 200, headers);
    }

    // =============================================
    // OTHER EVENTS
    // =============================================
    log('ℹ️ Unhandled event: ' + eventType);
    return res.json({ success: true, message: 'Event received', event: eventType }, 200, headers);
  }

  // Unknown method
  return res.json({ error: 'Method not allowed' }, 405, headers);
};
