// Appwrite Function: Salla Webhook Handler (Easy Mode)
// Handles app.store.authorize webhook event to get tokens automatically

import { Client, Databases, ID, Query } from 'node-appwrite';

// Salla App Configuration - NEW APP
const SALLA_CLIENT_ID = 'b6b5fbb1-a9e5-4fe3-9257-281d1006f509';
const SALLA_CLIENT_SECRET = 'd54bf327ea17bcf3419eb5234b19506dfb6180e1746265e11b4beb8fae991ab9';

export default async ({ req, res, log, error }) => {
  
  // ============================================
  // HANDLE GET REQUESTS (Status Check)
  // ============================================
  if (req.method === 'GET') {
    log('✓ Webhook endpoint ready');
    return res.send(`
      <html>
      <head><meta charset="utf-8"><title>AI Smart Assistant - Webhook</title></head>
      <body style="font-family:Arial;text-align:center;padding:50px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;">
        <h1>✅ AI Smart Assistant - علام</h1>
        <p>Webhook endpoint is ready to receive Salla events.</p>
        <p style="opacity:0.7;">Easy Mode enabled - tokens received via webhook</p>
      </body>
      </html>
    `, 200, { 'Content-Type': 'text/html; charset=utf-8' });
  }
  
  // ============================================
  // HANDLE POST REQUESTS (Webhooks)
  // ============================================
  if (req.method === 'POST') {
    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      log('❌ Invalid JSON payload');
      return res.json({ success: false, error: 'Invalid JSON' }, 400);
    }
    
    const eventType = payload.event;
    const merchant = payload.merchant || payload.data?.merchant;
    const merchantId = merchant?.id?.toString();
    
    log(`📨 Received webhook: ${eventType}`);
    log(`🏪 Merchant ID: ${merchantId}`);
    
    // Initialize Appwrite
    const client = new Client()
      .setEndpoint('https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);
    
    const databases = new Databases(client);
    const DATABASE_ID = '6946699d001194236820';
    const COLLECTION_ID = 'store_connections';
    
    // ============================================
    // HANDLE app.store.authorize (Easy Mode Token)
    // ============================================
    if (eventType === 'app.store.authorize') {
      log('🔐 App authorization event received (Easy Mode)');
      
      const accessToken = payload.data?.access_token;
      const refreshToken = payload.data?.refresh_token;
      const expiresIn = payload.data?.expires_in;
      
      if (!accessToken) {
        log('❌ No access token in payload');
        return res.json({ success: false, error: 'No access token' }, 400);
      }
      
      log('✅ Access token received: ' + accessToken.substring(0, 20) + '...');
      
      try {
        // Get store info
        const storeResponse = await fetch('https://api.salla.dev/admin/v2/store/info', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const storeData = await storeResponse.json();
        const storeName = storeData.data?.name || 'متجر';
        
        log('📦 Store name: ' + storeName);
        
        // Fetch products
        let products = [];
        try {
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
            inStock: p.quantity === null || p.quantity > 0,
            image: p.main_image
          }));
          log(`✅ Fetched ${products.length} products`);
        } catch (e) {
          log('⚠️ Could not fetch products: ' + e.message);
        }
        
        // Fetch shipping
        let shipping = [];
        try {
          const shippingRes = await fetch('https://api.salla.dev/admin/v2/shipping/zones', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const shippingData = await shippingRes.json();
          shipping = (shippingData.data || []).map(z => ({
            id: z.id,
            name: z.name,
            countries: z.countries || [],
            methods: (z.shipping_methods || []).map(m => ({
              name: m.name,
              cost: m.cost?.amount || 0
            }))
          }));
          log(`✅ Fetched ${shipping.length} shipping zones`);
        } catch (e) {
          log('⚠️ Could not fetch shipping: ' + e.message);
        }
        
        // Fetch coupons
        let coupons = [];
        try {
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
          log(`✅ Fetched ${coupons.length} active coupons`);
        } catch (e) {
          log('⚠️ Could not fetch coupons: ' + e.message);
        }
        
        // Fetch special offers
        let offers = [];
        try {
          const offersRes = await fetch('https://api.salla.dev/admin/v2/special-offers?status=active', {
            headers: { 'Authorization': `Bearer ${accessToken}` }
          });
          const offersData = await offersRes.json();
          offers = (offersData.data || []).map(o => ({
            id: o.id,
            name: o.name,
            type: o.offer_type,
            discount: o.amount || o.percentage
          }));
          log(`✅ Fetched ${offers.length} special offers`);
        } catch (e) {
          log('⚠️ Could not fetch offers: ' + e.message);
        }
        
        // Check if store exists
        let existingDoc = null;
        try {
          const existing = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.equal('merchantId', merchantId)
          ]);
          if (existing.documents.length > 0) {
            existingDoc = existing.documents[0];
          }
        } catch (e) {
          log('ℹ️ No existing store found');
        }
        
        const storeDocument = {
          merchantId: merchantId,
          storeName: storeName,
          accessToken: accessToken,
          refreshToken: refreshToken || '',
          tokenExpiresAt: new Date(Date.now() + (expiresIn || 14400) * 1000).toISOString(),
          cachedProducts: JSON.stringify(products),
          cachedShipping: JSON.stringify(shipping),
          cachedCoupons: JSON.stringify(coupons),
          cachedOffers: JSON.stringify(offers),
          cacheLastUpdated: new Date().toISOString(),
          installedAt: existingDoc?.installedAt || new Date().toISOString(),
          isActive: true
        };
        
        if (existingDoc) {
          await databases.updateDocument(DATABASE_ID, COLLECTION_ID, existingDoc.$id, storeDocument);
          log('✅ Updated existing store: ' + merchantId);
        } else {
          await databases.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), storeDocument);
          log('✅ Created new store: ' + merchantId);
        }
        
        return res.json({ 
          success: true, 
          message: 'Store connected successfully',
          storeName: storeName,
          productsCount: products.length
        });
        
      } catch (e) {
        error('❌ Error processing authorization: ' + e.message);
        return res.json({ success: false, error: e.message }, 500);
      }
    }
    
    // ============================================
    // HANDLE app.installed
    // ============================================
    if (eventType === 'app.installed') {
      log('📱 App installed on store: ' + merchantId);
      return res.json({ success: true, message: 'App installed - waiting for authorization' });
    }
    
    // ============================================
    // HANDLE app.uninstalled
    // ============================================
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
        log('⚠️ Could not update store status: ' + e.message);
      }
      
      return res.json({ success: true, message: 'Store marked as inactive' });
    }
    
    // ============================================
    // HANDLE product.created / product.updated
    // ============================================
    if (eventType === 'product.created' || eventType === 'product.updated') {
      log('📦 Product event - will refresh on next daily sync');
      return res.json({ success: true, message: 'Product event received' });
    }
    
    // ============================================
    // HANDLE other events
    // ============================================
    log('ℹ️ Unhandled event type: ' + eventType);
    return res.json({ success: true, message: 'Event received', event: eventType });
  }
  
  // Unknown method
  return res.json({ error: 'Method not allowed' }, 405);
};
