// Appwrite Function: Salla Webhook Handler with OAuth Callback & Auto Widget Injection
// CommonJS entrypoint (Appwrite Node runtime loads /function/index.js via require)

const { Client, Databases, ID } = require('node-appwrite');

// Salla OAuth Configuration
const SALLA_CLIENT_ID = 'a528b4f5-ed26-4a09-8aba-036938afa894';
const SALLA_CLIENT_SECRET = '148151133bbcfab7589a35da9e69158ff4a18cbdc0212627165b22226bbc6614';
const SALLA_TOKEN_URL = 'https://accounts.salla.sa/oauth2/token';
const REDIRECT_URI = 'https://6948f4cc003d4c022adb.fra.appwrite.run/';

module.exports = async ({ req, res, log }) => {
  // ============================================
  // HANDLE OAUTH CALLBACK (GET requests)
  // ============================================
  if (req.method === 'GET') {
    const queryParams = new URLSearchParams(req.queryString || '');
    const code = queryParams.get('code');
    const errorParam = queryParams.get('error');
    const errorDesc = queryParams.get('error_description');

    if (errorParam) {
      log('❌ OAuth error from Salla: ' + errorParam + ' - ' + errorDesc);
      return res.send(
        `
        <html dir="rtl">
        <head><meta charset="utf-8"><title>خطأ</title></head>
        <body style="font-family:Arial;text-align:center;padding:50px;background:#dc3545;color:white;">
          <h1>❌ فشل الربط</h1>
          <p>${errorDesc || errorParam}</p>
          <p>يرجى المحاولة مرة أخرى</p>
        </body>
        </html>
      `,
        400,
        { 'Content-Type': 'text/html; charset=utf-8' }
      );
    }

    if (!code) {
      log('✓ Webhook endpoint ready (no OAuth code)');
      return res.send(
        `
        <html>
        <head><meta charset="utf-8"><title>Salla Webhook</title></head>
        <body style="font-family:Arial;text-align:center;padding:50px;background:linear-gradient(135deg,#667eea,#764ba2);color:white;">
          <h1>✅ Salla Webhook & OAuth Ready</h1>
          <p>This endpoint handles Salla OAuth callbacks and webhooks.</p>
        </body>
        </html>
      `,
        200,
        { 'Content-Type': 'text/html; charset=utf-8' }
      );
    }

    log('🔐 OAuth callback received with code: ' + code.substring(0, 10) + '...');

    try {
      log('📤 Exchanging code for access token...');

      const tokenResponse = await fetch(SALLA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          client_id: SALLA_CLIENT_ID,
          client_secret: SALLA_CLIENT_SECRET,
          code,
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        log('❌ Token exchange failed: ' + JSON.stringify(tokenData));
        return res.send(
          `
          <html dir="rtl">
          <head><meta charset="utf-8"><title>خطأ</title></head>
          <body style="font-family:Arial;text-align:center;padding:50px;background:#dc3545;color:white;">
            <h1>❌ فشل الربط</h1>
            <p>Error: ${tokenData.error_description || tokenData.error || 'Unknown error'}</p>
            <p>يرجى المحاولة مرة أخرى</p>
          </body>
          </html>
        `,
          400,
          { 'Content-Type': 'text/html; charset=utf-8' }
        );
      }

      log('✅ Token received successfully!');
      log('Access Token: ' + (tokenData.access_token ? tokenData.access_token.substring(0, 20) + '...' : 'missing'));

      const storeResponse = await fetch('https://api.salla.dev/admin/v2/store/info', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      const storeData = await storeResponse.json();
      log('📦 Store info: ' + JSON.stringify(storeData.data?.name || 'Unknown'));

      const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY);

      const databases = new Databases(client);

      const merchantIdRaw = storeData.data?.id || 0;
      const merchantIdInt = parseInt(merchantIdRaw, 10) || 0;
      const merchantIdStr = String(merchantIdRaw);

      const connectionDoc = await databases.createDocument('6946699d001194236820', 'store_connections', ID.unique(), {
        storeConnectionId: merchantIdInt,
        merchantId: merchantIdInt,
        createdDate: new Date().toISOString(),
        connectionStatus: 'active',
        lastActivityDate: new Date().toISOString(),
        notes: `Connected from ${storeData.data?.domain || 'Salla'} - ${storeData.data?.name || 'Store'}`,
      });

      log('✅ Store saved to database: ' + connectionDoc.$id);

      return res.send(
        `
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
      `,
        200,
        { 'Content-Type': 'text/html; charset=utf-8' }
      );
    } catch (oauthError) {
      log('❌ OAuth error: ' + oauthError.message);
      return res.send(
        `
        <html dir="rtl">
        <head><meta charset="utf-8"><title>خطأ</title></head>
        <body style="font-family:Arial;text-align:center;padding:50px;background:#dc3545;color:white;">
          <h1>❌ حدث خطأ</h1>
          <p>${oauthError.message}</p>
        </body>
        </html>
      `,
        500,
        { 'Content-Type': 'text/html; charset=utf-8' }
      );
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

    const webhookData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    log('Event type: ' + webhookData.event);
    log('Merchant: ' + webhookData.merchant?.name);

    if (webhookData.event !== 'app.store.authorize') {
      log('ℹ️ Ignoring event: ' + webhookData.event);
      return res.json({ success: true, message: 'Event ignored' });
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    const { merchant, data, created_at } = webhookData;

    const merchantIdRaw =
      (merchant && typeof merchant === 'object' ? merchant.id : merchant) ??
        data?.merchant_id ??
        data?.store_id ??
        data?.id ??
        0;
    const merchantIdInt = parseInt(merchantIdRaw, 10) || 0;
    const merchantIdStr = String(merchantIdRaw);

    const merchantName = (merchant && typeof merchant === 'object' ? merchant.name : null) || 'Unknown Store';
    const merchantDomain = (merchant && typeof merchant === 'object' ? merchant.domain : null) || '';
    const merchantEmail = (merchant && typeof merchant === 'object' ? merchant.email : null) || '';

    const accessToken = data?.access_token;
    const refreshToken = data?.refresh_token;
    const expiresIn = data?.expires_in;

    log('✓ Processing store authorization...');

    const connectionDoc = await databases.createDocument('6946699d001194236820', 'store_connections', ID.unique(), {
      storeConnectionId: merchantIdInt,
      merchantId: merchantIdInt,
      createdDate: new Date().toISOString(),
      connectionStatus: 'active',
      lastActivityDate: new Date().toISOString(),
      notes: `Connected from ${merchantDomain || 'Salla'} - ${merchantName || 'Store'}`,
    });

    log('✓ Store connected: ' + connectionDoc.$id);
    log('✓ Store Name: ' + merchantName);
    log('✓ Domain: ' + merchantDomain);

    log('🤖 Attempting to auto-inject chatbot widget...');

    try {
      const widgetUrl = 'https://cdn.jsdelivr.net/gh/ahmed837363/chatbot3@main/chatbot-widget.js';
      const widgetInjectionCode = `<script async src="${widgetUrl}" data-store-id="${merchantIdStr}"></script>`;

      // First, get the active theme ID
      let themeId = null;
      try {
        const themesResp = await fetch('https://api.salla.dev/admin/v2/themes', {
          headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
        });
        if (themesResp.ok) {
          const themesData = await themesResp.json();
          log('📦 Themes response: ' + JSON.stringify(themesData).substring(0, 500));
          themeId = themesData.data?.[0]?.id || themesData.data?.id;
          if (themeId) log('🎨 Found theme ID: ' + themeId);
        }
      } catch (e) {
        log('⚠️ Could not fetch themes: ' + e.message);
      }

      // Build list of endpoints to try (including theme-specific ones)
      const candidates = [
        // Theme-specific endpoints (if we have a theme ID)
        ...(themeId ? [
          {
            name: `themes/${themeId}/settings (PATCH)`,
            url: `https://api.salla.dev/admin/v2/themes/${themeId}/settings`,
            method: 'PATCH',
            body: { custom_code_footer: widgetInjectionCode },
          },
          {
            name: `themes/${themeId} (PATCH)`,
            url: `https://api.salla.dev/admin/v2/themes/${themeId}`,
            method: 'PATCH',
            body: { settings: { custom_code_footer: widgetInjectionCode } },
          },
        ] : []),
        // General store/settings endpoints
        {
          name: 'store/info (PATCH)',
          url: 'https://api.salla.dev/admin/v2/store/info',
          method: 'PATCH',
          body: { custom_code_footer: widgetInjectionCode },
        },
        {
          name: 'store (PATCH)',
          url: 'https://api.salla.dev/admin/v2/store',
          method: 'PATCH',
          body: { custom_code: { footer: widgetInjectionCode } },
        },
        {
          name: 'customizations/scripts',
          url: 'https://api.salla.dev/admin/v2/customizations/scripts',
          method: 'POST',
          body: { location: 'footer', content: widgetInjectionCode, active: true },
        },
        {
          name: 'scripts',
          url: 'https://api.salla.dev/admin/v2/scripts',
          method: 'POST',
          body: { src: widgetUrl, location: 'footer', display_scope: 'all' },
        },
      ];

      let injected = false;

      for (const candidate of candidates) {
        log(`🔎 Trying widget injection endpoint: ${candidate.name}`);

        const resp = await fetch(candidate.url, {
          method: candidate.method || 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(candidate.body),
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
        try {
          await databases.updateDocument('6946699d001194236820', 'store_connections', connectionDoc.$id, {
            lastActivityDate: new Date().toISOString(),
            notes: `Widget injected successfully at ${new Date().toISOString()}`,
          });
        } catch (updateErr) {
          log('⚠️ Could not update connection doc after injection: ' + updateErr.message);
        }
      } else {
        log('⚠️ Auto-inject failed on all endpoints. Widget will NOT appear until custom code is enabled in the store.');
        log('Manual fallback code: ' + widgetInjectionCode);
      }
    } catch (injectionError) {
      log('⚠️ Widget injection error: ' + injectionError.message);
      log('ℹ️ Widget will NOT appear until injected into the store theme/custom code.');
    }

    return res.json(
      {
        success: true,
        message: '✅ Store connected and chatbot installed! 🎉',
        connectionId: connectionDoc.$id,
        storeName: merchantName,
        widgetUrl: 'https://cdn.jsdelivr.net/gh/ahmed837363/chatbot3@main/chatbot-widget.js',
      },
      200
    );
  } catch (err) {
    log('❌ Error: ' + err.message);
    log('Stack: ' + err.stack);

    return res.json(
      {
        success: false,
        error: err.message,
      },
      500
    );
  }
};
