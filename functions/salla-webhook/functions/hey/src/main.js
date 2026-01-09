// Appwrite Function: Salla Webhook Handler with OAuth Callback & Auto Widget Injection
// This handles OAuth callbacks, webhooks, and scheduled data refresh

import { Client, Databases, ID, Query } from 'node-appwrite';
import { refreshStoreData } from './refresh.js';

// Salla OAuth Configuration
const SALLA_CLIENT_ID = 'a528b4f5-ed26-4a09-8aba-036938afa894';
const SALLA_CLIENT_SECRET = '148151133bbcfab7589a35da9e69158ff4a18cbdc0212627165b22226bbc6614';
const SALLA_TOKEN_URL = 'https://accounts.salla.sa/oauth2/token';
const REDIRECT_URI = 'https://695e4b870024fb66ce24.fra.appwrite.run/';

export default async ({ req, res, log, error }) => {
  
  // ============================================
  // HANDLE SCHEDULED REFRESH (triggered by cron or manual)
  // ============================================
  const queryParams = new URLSearchParams(req.queryString || '');
  if (queryParams.get('action') === 'refresh' || req.path === '/refresh') {
    log('🔄 Starting scheduled data refresh for all stores...');
    
    try {
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);
      
      // Get all active stores
      const stores = await databases.listDocuments(
        '6946699d001194236820',
        'store_connections',
        [Query.equal('status', 'active'), Query.limit(100)]
      );
      
      log(`📦 Found ${stores.documents.length} active stores to refresh`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const store of stores.documents) {
        const success = await refreshStoreData(databases, store, log);
        if (success) successCount++;
        else failCount++;
      }
      
      log(`✅ Refresh complete: ${successCount} success, ${failCount} failed`);
      
      return res.json({
        success: true,
        message: `Refreshed ${successCount} stores`,
        failed: failCount,
        timestamp: new Date().toISOString()
      });
      
    } catch (err) {
      log('❌ Refresh error: ' + err.message);
      return res.json({ success: false, error: err.message }, 500);
    }
  }
  
  // ============================================
  // HANDLE OAUTH CALLBACK (GET requests)
  // ============================================
  if (req.method === 'GET') {
    // Parse query parameters properly
    const code = queryParams.get('code');
    const errorParam = queryParams.get('error');
    const errorDesc = queryParams.get('error_description');
    
    // Handle OAuth errors from Salla
    if (errorParam) {
      log('❌ OAuth error from Salla: ' + errorParam + ' - ' + errorDesc);
      return res.send(`
        <html dir="rtl">
        <head><meta charset="utf-8"><title>خطأ</title></head>
        <body style="font-family:Arial;text-align:center;padding:50px;background:#dc3545;color:white;">
          <h1>❌ فشل الربط</h1>
          <p>${errorDesc || errorParam}</p>
          <p>يرجى المحاولة مرة أخرى</p>
        </body>
        </html>
      `, 400, { 'Content-Type': 'text/html; charset=utf-8' });
    }
    
    // If no code, just return status
    if (!code) {
      log('✓ Webhook endpoint ready (no OAuth code)');
      return res.send(`
        <html>
        <head><meta charset="utf-8"><title>Salla Webhook</title></head>
        <body style="font-family:Arial;text-align:center;padding:50px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;">
          <h1>✅ Salla Webhook & OAuth Ready</h1>
          <p>This endpoint handles Salla OAuth callbacks and webhooks.</p>
        </body>
        </html>
      `, 200, { 'Content-Type': 'text/html; charset=utf-8' });
    }
    
    log('🔐 OAuth callback received with code: ' + code.substring(0, 10) + '...');
    
    try {
      // Exchange code for access token
      log('📤 Exchanging code for access token...');
      
      const tokenResponse = await fetch(SALLA_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: SALLA_CLIENT_ID,
          client_secret: SALLA_CLIENT_SECRET,
          code: code,
          redirect_uri: REDIRECT_URI
        })
      });
      
      const tokenData = await tokenResponse.json();
      
      if (!tokenResponse.ok) {
        log('❌ Token exchange failed: ' + JSON.stringify(tokenData));
        return res.send(`
          <html dir="rtl">
          <head><meta charset="utf-8"><title>خطأ</title></head>
          <body style="font-family:Arial;text-align:center;padding:50px;background:#dc3545;color:white;">
            <h1>❌ فشل الربط</h1>
            <p>Error: ${tokenData.error_description || tokenData.error || 'Unknown error'}</p>
            <p>يرجى المحاولة مرة أخرى</p>
          </body>
          </html>
        `, 400, { 'Content-Type': 'text/html; charset=utf-8' });
      }
      
      log('✅ Token received successfully!');
      log('Access Token: ' + tokenData.access_token?.substring(0, 20) + '...');
      
      // Get store info from Salla
      const storeResponse = await fetch('https://api.salla.dev/admin/v2/store/info', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      const storeData = await storeResponse.json();
      log('📦 Store info: ' + JSON.stringify(storeData.data?.name || 'Unknown'));
      
      // Initialize Appwrite
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);
      
      // Save to database
      const connectionDoc = await databases.createDocument(
        '6946699d001194236820',
        'store_connections',
        ID.unique(),
        {
          storeConnectionId: String(storeData.data?.id || 'unknown'),
          merchantId: String(storeData.data?.id || 'unknown'),
          storeName: storeData.data?.name || 'Salla Store',
          domain: storeData.data?.domain || '',
          email: storeData.data?.email || '',
          platform: 'salla',
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || '',
          expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
          connectedAt: new Date().toISOString(),
          status: 'active',
          widgetInjected: false
        }
      );
      
      log('✅ Store saved to database: ' + connectionDoc.$id);
      
      // Return success HTML page
      return res.send(`
        <html dir="rtl">
        <head>
          <meta charset="utf-8">
          <title>تم الربط بنجاح!</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; margin: 0; }
            .container { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; max-width: 500px; margin: 0 auto; }
            h1 { font-size: 48px; margin-bottom: 10px; }
            .store-name { font-size: 24px; background: rgba(255,255,255,0.2); padding: 15px 30px; border-radius: 10px; display: inline-block; margin: 20px 0; }
            p { font-size: 18px; opacity: 0.9; }
            .close-btn { background: white; color: #667eea; border: none; padding: 15px 40px; font-size: 18px; border-radius: 10px; cursor: pointer; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✅</h1>
            <h2>تم ربط المتجر بنجاح!</h2>
            <div class="store-name">🏪 ${storeData.data?.name || 'متجرك'}</div>
            <p>تم تثبيت الشات بوت على متجرك</p>
            <p>يمكنك الآن إغلاق هذه الصفحة</p>
            <button class="close-btn" onclick="window.close()">إغلاق</button>
          </div>
        </body>
        </html>
      `, 200, { 'Content-Type': 'text/html; charset=utf-8' });
      
    } catch (oauthError) {
      log('❌ OAuth error: ' + oauthError.message);
      return res.send(`
        <html dir="rtl">
        <head><meta charset="utf-8"><title>خطأ</title></head>
        <body style="font-family:Arial;text-align:center;padding:50px;background:#dc3545;color:white;">
          <h1>❌ حدث خطأ</h1>
          <p>${oauthError.message}</p>
        </body>
        </html>
      `, 500, { 'Content-Type': 'text/html; charset=utf-8' });
    }
  }
  
  // ============================================
  // HANDLE WEBHOOKS (POST requests)
  // ============================================
  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  try {
    log('📩 Received Salla webhook');
    
    // Parse webhook data
    const webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    log('Event type: ' + webhookData.event);
    log('Merchant: ' + webhookData.merchant?.name);

    // Only process app.store.authorize events
    if (webhookData.event !== 'app.store.authorize') {
      log('ℹ️ Ignoring event: ' + webhookData.event);
      return res.json({ success: true, message: 'Event ignored' });
    }

    // Initialize Appwrite
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Extract webhook data
    const { merchant, data, created_at } = webhookData;
    const merchantId = String(
      (merchant && typeof merchant === 'object' ? merchant.id : merchant) ??
      data?.merchant_id ??
      data?.store_id ??
      data?.id ??
      'unknown'
    );
    const merchantName = (merchant && typeof merchant === 'object' ? merchant.name : null) || 'Unknown Store';
    const merchantDomain = (merchant && typeof merchant === 'object' ? merchant.domain : null) || '';
    const merchantEmail = (merchant && typeof merchant === 'object' ? merchant.email : null) || '';
    const accessToken = data?.access_token;
    const refreshToken = data?.refresh_token;
    const expiresIn = data?.expires_in;

    log('✓ Processing store authorization...');

    // Save store connection to database
    const connectionDoc = await databases.createDocument(
      '6946699d001194236820', // database ID
      'store_connections', // collection ID
      ID.unique(), // auto-generate ID
      {
        storeConnectionId: merchantId,
        merchantId: merchantId,
        storeName: merchantName,
        domain: merchantDomain,
        email: merchantEmail,
        platform: 'salla',
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + (Number(expiresIn) || 3600) * 1000).toISOString(),
        connectedAt: created_at || new Date().toISOString(),
        status: 'active',
        widgetInjected: false
      }
    );

    log('✓ Store connected: ' + connectionDoc.$id);
    log('✓ Store Name: ' + merchantName);
    log('✓ Domain: ' + merchantDomain);

    // 📦 FETCH AND CACHE STORE DATA (Products, Shipping, Coupons, Offers)
    log('📦 Fetching store data from Salla API...');
    
    let storeDataCache = {
      products: [],
      shippingZones: [],
      coupons: [],
      offers: [],
      lastUpdated: new Date().toISOString()
    };

    try {
      // Fetch Products
      log('📦 Fetching products...');
      const productsResp = await fetch('https://api.salla.dev/admin/v2/products?per_page=100&status=sale', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });
      if (productsResp.ok) {
        const productsData = await productsResp.json();
        storeDataCache.products = (productsData.data || []).map(p => ({
          id: String(p.id),
          name: p.name,
          price: p.price?.amount || 0,
          currency: p.price?.currency || 'SAR',
          description: (p.description || '').replace(/<[^>]*>/g, '').substring(0, 200),
          url: p.url || '',
          image: p.images?.[0]?.url || '',
          inStock: p.quantity > 0 || p.unlimited_quantity
        }));
        log(`✅ Got ${storeDataCache.products.length} products`);
      }

      // Fetch Shipping Zones
      log('🚚 Fetching shipping zones...');
      const shippingResp = await fetch('https://api.salla.dev/admin/v2/shipping/zones', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });
      if (shippingResp.ok) {
        const shippingData = await shippingResp.json();
        storeDataCache.shippingZones = (shippingData.data || []).map(z => ({
          id: String(z.id),
          name: z.name,
          countries: z.countries?.map(c => c.name) || [],
          methods: (z.shipping_methods || []).map(m => ({
            name: m.name,
            cost: m.cost?.amount || 0,
            estimatedDays: m.estimated_delivery_time || ''
          }))
        }));
        log(`✅ Got ${storeDataCache.shippingZones.length} shipping zones`);
      }

      // Fetch Active Coupons
      log('🎟️ Fetching coupons...');
      const couponsResp = await fetch('https://api.salla.dev/admin/v2/coupons?status=active', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });
      if (couponsResp.ok) {
        const couponsData = await couponsResp.json();
        storeDataCache.coupons = (couponsData.data || []).map(c => ({
          code: c.code,
          type: c.type,
          discount: c.amount || c.percentage || 0,
          expiresAt: c.end_date || null
        }));
        log(`✅ Got ${storeDataCache.coupons.length} coupons`);
      }

      // Fetch Special Offers
      log('🎁 Fetching special offers...');
      const offersResp = await fetch('https://api.salla.dev/admin/v2/special-offers?status=active', {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
      });
      if (offersResp.ok) {
        const offersData = await offersResp.json();
        storeDataCache.offers = (offersData.data || []).map(o => ({
          name: o.name,
          type: o.type,
          discount: o.discount || 0,
          endsAt: o.end_date || null
        }));
        log(`✅ Got ${storeDataCache.offers.length} offers`);
      }

      // Save cached data to database
      log('💾 Saving store data to Appwrite...');
      await databases.updateDocument(
        '6946699d001194236820',
        'store_connections',
        connectionDoc.$id,
        {
          cachedProducts: JSON.stringify(storeDataCache.products).substring(0, 50000),
          cachedShipping: JSON.stringify(storeDataCache.shippingZones).substring(0, 10000),
          cachedCoupons: JSON.stringify(storeDataCache.coupons).substring(0, 5000),
          cachedOffers: JSON.stringify(storeDataCache.offers).substring(0, 5000),
          cacheLastUpdated: storeDataCache.lastUpdated
        }
      );
      log('✅ Store data cached successfully!');
      
    } catch (cacheError) {
      log('⚠️ Cache error (non-fatal): ' + cacheError.message);
      // Don't fail the whole process - store connection still succeeded
    }

    // 🤖 AUTO-INJECT WIDGET
    log('🤖 Attempting to auto-inject chatbot widget...');
    
    try {
      const widgetUrl = 'https://cdn.jsdelivr.net/gh/ahmed837363/chatbot3@main/chatbot-widget.js';
      const widgetInjectionCode = `<script async src="${widgetUrl}" data-store-id="${merchantId}"></script>`;

      const candidates = [
        {
          name: 'admin/v2/store/custom-code',
          url: 'https://api.salla.dev/admin/v2/store/custom-code',
          body: { location: 'footer', code: widgetInjectionCode, status: 'active' }
        },
        {
          name: 'admin/v2/settings/custom-code',
          url: 'https://api.salla.dev/admin/v2/settings/custom-code',
          body: { location: 'footer', code: widgetInjectionCode, enabled: true }
        },
        {
          name: 'admin/v2/settings/custom-scripts',
          url: 'https://api.salla.dev/admin/v2/settings/custom-scripts',
          body: { location: 'footer', code: widgetInjectionCode, enabled: true }
        }
      ];

      let injected = false;

      for (const candidate of candidates) {
        log(`🔎 Trying widget injection endpoint: ${candidate.name}`);

        const resp = await fetch(candidate.url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(candidate.body)
        });

        const respText = await resp.text();

        if (resp.ok) {
          log(`✅ Widget injected via ${candidate.name}`);
          injected = true;
          break;
        }

        log(`⚠️ Injection failed via ${candidate.name}: ${resp.status}`);
        if (respText) {
          log('Response: ' + respText.substring(0, 800));
        }
      }

      if (injected) {
        await databases.updateDocument(
          '6946699d001194236820',
          'store_connections',
          connectionDoc.$id,
          { widgetInjected: true }
        );
      } else {
        log('⚠️ Auto-inject failed on all endpoints. Widget will NOT appear until custom code is enabled in the store.');
        log('Manual fallback code: ' + widgetInjectionCode);
      }
    } catch (injectionError) {
      log('⚠️ Widget injection error: ' + injectionError.message);
      log('ℹ️ Widget will NOT appear until injected into the store theme/custom code.');
      // Don't fail the whole process - store connection still succeeded
    }

    // Success response
    return res.json({
      success: true,
      message: '✅ Store connected and chatbot installed! 🎉',
      connectionId: connectionDoc.$id,
      storeName: merchantName,
      widgetUrl: 'https://cdn.jsdelivr.net/gh/ahmed837363/chatbot3@main/chatbot-widget.js'
    }, 200);

  } catch (err) {
    log('❌ Error: ' + err.message);
    log('Stack: ' + err.stack);
    
    return res.json({
      success: false,
      error: err.message
    }, 500);
  }
};
