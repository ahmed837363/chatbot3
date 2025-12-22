// Appwrite Function: Salla Webhook Handler
// This receives POST requests from Salla when merchants install your app

import { Client, Databases } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.json({ error: 'Method not allowed' }, 405);
  }

  try {
    log('📩 Received Salla webhook');
    
    // Parse webhook data
    const webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    log('Event type:', webhookData.event);
    log('Merchant:', webhookData.merchant?.name);

    // Check if this is the authorize event
    if (webhookData.event !== 'app.store.authorize') {
      log('ℹ️ Ignoring event:', webhookData.event);
      return res.json({ success: true, message: 'Event ignored' });
    }

    // Initialize Appwrite
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Extract data
    const { merchant, data } = webhookData;
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;

    log('✓ Saving store connection...');

    // Save connection to database
    const connection = await databases.createDocument(
      '6946699d001194236820', // database ID
      'store_connections', // collection ID
      'unique()',
      {
        customerId: 'salla_' + merchant.id,
        platform: 'salla',
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        storeUrl: merchant.domain || `https://salla.sa/shops/${merchant.id}`,
        storeName: merchant.name || 'Unknown Store',
        merchantId: String(merchant.id),
        connectedAt: new Date().toISOString()
      }
    );

    log('✓ Store connected:', connection.$id);

    // 🚀 Automatically inject chatbot widget
    log('🤖 Auto-installing chatbot widget...');
    
    try {
      const widgetCode = `<script src="https://chatbot3.appwrite.network/chatbot-widget.js" data-store-id="${merchant.id}"></script>`;
      
      const response = await fetch('https://api.salla.dev/admin/v2/store/custom-code', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          location: 'footer',
          code: widgetCode,
          status: 'active'
        })
      });

      if (response.ok) {
        const result = await response.json();
        log('✅ Chatbot automatically installed!');
        log('✓ Widget ID:', result.data?.id);
      } else {
        const errorData = await response.json();
        error('⚠️ Auto-install failed:', errorData);
        log('Manual installation needed');
      }
    } catch (deployError) {
      error('❌ Widget deployment error:', deployError);
    }

    // Return success
    return res.json({
      success: true,
      message: 'Store connected and chatbot installed! 🎉',
      connectionId: connection.$id,
      storeName: merchant.name
    });

  } catch (err) {
    error('❌ Webhook error:', err);
    return res.json({ 
      success: false, 
      error: err.message 
    }, 500);
  }
};
