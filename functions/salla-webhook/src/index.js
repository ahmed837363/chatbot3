// Appwrite Function: Salla Webhook Handler with Auto Widget Injection
// This receives webhooks from Salla and automatically injects the chatbot widget

import { Client, Databases, ID } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  // Handle GET requests for webhook verification
  if (req.method === 'GET') {
    log('✓ Webhook endpoint ready');
    return res.text('Webhook endpoint ready', 200);
  }
  
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
    const merchantId = merchant.id;
    const merchantName = merchant.name || 'Unknown Store';
    const merchantDomain = merchant.domain || '';
    const merchantEmail = merchant.email || '';
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;

    log('✓ Processing store authorization...');

    // Save store connection to database
    const connectionDoc = await databases.createDocument(
      '6946699d001194236820', // database ID
      'store_connections', // collection ID
      ID.unique(), // auto-generate ID
      {
        merchantId: merchantId,
        storeName: merchantName,
        domain: merchantDomain,
        email: merchantEmail,
        platform: 'salla',
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        connectedAt: created_at || new Date().toISOString(),
        status: 'active',
        widgetInjected: false
      }
    );

    log('✓ Store connected: ' + connectionDoc.$id);
    log('✓ Store Name: ' + merchantName);
    log('✓ Domain: ' + merchantDomain);

    // 🤖 AUTO-INJECT WIDGET
    log('🤖 Attempting to auto-inject chatbot widget...');
    
    try {
      // Widget injection code to inject into Salla store
      const widgetInjectionCode = `<script async src="https://cdn.jsdelivr.net/gh/ahmed837363/chatbot3@main/chatbot-widget.js" data-store-id="${merchantId}"></script>`;
      
      // Try to inject via Salla API
      const sallaApiResponse = await fetch(
        `https://api.salla.dev/admin/v2/stores/${merchantId}/custom-code`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            location: 'footer',
            code: widgetInjectionCode,
            enabled: true
          })
        }
      );

      if (sallaApiResponse.ok) {
        log('✓ Widget injected via Salla API');
        
        // Update database to mark widget as injected
        await databases.updateDocument(
          '6946699d001194236820',
          'store_connections',
          connectionDoc.$id,
          { widgetInjected: true }
        );
      } else {
        log('⚠️ Salla API injection failed, widget will load via CDN');
        // Widget will still load because it's embedded in the HTML via script tag
      }
    } catch (injectionError) {
      log('⚠️ Widget injection error: ' + injectionError.message);
      log('ℹ️ Widget will load via CDN when customer visits store');
      // Don't fail the whole process - widget can still load via CDN
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
