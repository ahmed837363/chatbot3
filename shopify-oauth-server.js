// Shopify OAuth Backend Service
// Run this on your server to handle OAuth token exchange and chatbot installation

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuration
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || 'http://localhost:9000/oauth/shopify/callback';
const CHATBOT_WIDGET_URL = process.env.CHATBOT_WIDGET_URL || 'https://your-domain.com/chatbot-widget.js';

// Validation
if (!SHOPIFY_CLIENT_ID || !SHOPIFY_CLIENT_SECRET) {
  console.error('❌ Missing SHOPIFY_CLIENT_ID or SHOPIFY_CLIENT_SECRET environment variables');
  process.exit(1);
}

// Store to keep track of OAuth states (use database in production)
const oauthStates = new Map();

/**
 * POST /oauth/shopify/auth-url
 * Generate OAuth authorization URL for customer
 */
app.post('/oauth/shopify/auth-url', (req, res) => {
  try {
    const { shopStore } = req.body;

    if (!shopStore) {
      return res.status(400).json({ 
        error: 'Shop store parameter required' 
      });
    }

    // Validate store format
    const storeRegex = /^[a-z0-9-]+\.myshopify\.com$/;
    if (!storeRegex.test(shopStore)) {
      return res.status(400).json({ 
        error: 'Invalid store format. Use: mystore.myshopify.com' 
      });
    }

    // Generate random state for security
    const state = crypto.randomBytes(16).toString('hex');
    oauthStates.set(state, { shopStore, createdAt: Date.now() });

    // Build OAuth URL
    const authUrl = new URL(`https://${shopStore}/admin/oauth/authorize`);
    authUrl.searchParams.append('client_id', SHOPIFY_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', [
      'write_products',
      'read_products',
      'read_orders',
      'write_settings',
      'write_themes',
      'read_themes',
      'write_theme_asset_modifications',
      'read_theme_asset_modifications'
    ].join(','));
    authUrl.searchParams.append('state', state);

    console.log(`✓ Authorization URL generated for ${shopStore}`);

    res.json({
      success: true,
      authUrl: authUrl.toString(),
      shop: shopStore
    });
  } catch (error) {
    console.error('❌ Error generating auth URL:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate authorization URL' 
    });
  }
});

/**
 * GET /oauth/shopify/callback
 * Shopify redirects customer here after authorization
 */
app.get('/oauth/shopify/callback', async (req, res) => {
  try {
    const { code, state, shop, hmac } = req.query;

    // Validate HMAC (security check)
    if (!verifyShopifyHmac(req.query, SHOPIFY_CLIENT_SECRET)) {
      console.error('❌ Invalid HMAC - possible security breach');
      return res.status(401).json({ error: 'Invalid request HMAC' });
    }

    // Verify state
    if (!oauthStates.has(state)) {
      console.error('❌ Invalid state parameter');
      return res.status(400).json({ error: 'Invalid state parameter' });
    }

    const stateData = oauthStates.get(state);
    oauthStates.delete(state);

    if (!code || !shop) {
      return res.status(400).json({ error: 'Missing code or shop parameter' });
    }

    console.log(`🔄 Exchanging code for access token... (${shop})`);

    // Exchange code for access token
    const tokenResponse = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code: code
      }
    );

    const { access_token, scope } = tokenResponse.data;

    if (!access_token) {
      throw new Error('No access token returned from Shopify');
    }

    console.log(`✓ Access token received for ${shop}`);

    // Get shop information
    const shopInfo = await getShopInfo(shop, access_token);
    console.log(`✓ Shop info retrieved: ${shopInfo.name}`);

    // Install chatbot widget to theme
    await installChatbotToTheme(shop, access_token);
    console.log(`✓ Chatbot widget installed on ${shop}`);

    // Save connection to database
    const storeConnection = await saveStoreConnection({
      shop,
      shopName: shopInfo.name,
      shopEmail: shopInfo.email,
      shopUrl: shopInfo.primaryDomain?.url,
      accessToken,
      scope,
      installedAt: new Date().toISOString()
    });

    console.log(`✓ Store connection saved with ID: ${storeConnection.id}`);

    // Redirect customer back to success page
    res.redirect(`/shopify-connect.html?success=true&shop=${encodeURIComponent(shop)}`);
  } catch (error) {
    console.error('❌ OAuth callback error:', error.message);
    res.redirect(`/shopify-connect.html?error=${encodeURIComponent(error.message)}`);
  }
});

/**
 * Get shop information using GraphQL API
 */
async function getShopInfo(shop, accessToken) {
  try {
    const response = await axios.post(
      `https://${shop}/admin/api/2024-01/graphql.json`,
      {
        query: `
          query {
            shop {
              id
              name
              email
              primaryDomain {
                url
              }
              plan {
                displayName
              }
            }
          }
        `
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }

    return response.data.data.shop;
  } catch (error) {
    throw new Error(`Failed to fetch shop info: ${error.message}`);
  }
}

/**
 * Install chatbot widget to store's main theme
 */
async function installChatbotToTheme(shop, accessToken) {
  try {
    // Get themes
    const themesResponse = await axios.get(
      `https://${shop}/admin/api/2024-01/themes.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken
        }
      }
    );

    const mainTheme = themesResponse.data.themes.find(t => t.role === 'main');
    if (!mainTheme) {
      throw new Error('No main theme found');
    }

    // Create/update theme asset with chatbot script
    const assetResponse = await axios.put(
      `https://${shop}/admin/api/2024-01/themes/${mainTheme.id}/assets.json`,
      {
        asset: {
          key: 'snippets/chatbot-widget.liquid',
          value: `<!-- AI Chatbot Widget -->\n<script defer src="${CHATBOT_WIDGET_URL}"></script>`
        }
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );

    return assetResponse.data;
  } catch (error) {
    throw new Error(`Failed to install chatbot: ${error.message}`);
  }
}

/**
 * Save store connection to database
 */
async function saveStoreConnection(storeData) {
  try {
    // TODO: Replace with your actual database
    // Example with Appwrite:
    // const db = new Database(client);
    // return await db.createDocument('database_id', 'stores', ID.unique(), storeData);

    // For now, just log and return
    console.log('📝 Store connection data:', storeData);

    return {
      id: crypto.randomUUID(),
      ...storeData,
      savedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('⚠️  Warning: Failed to save store connection:', error.message);
    // Don't throw - webhook was still installed
    return { error: error.message };
  }
}

/**
 * Verify HMAC signature from Shopify
 */
function verifyShopifyHmac(query, secret) {
  const { hmac, ...data } = query;

  const encoded = Object.keys(data)
    .map(key => `${key}=${data[key]}`)
    .join('&');

  const calculated = crypto
    .createHmac('sha256', secret)
    .update(encoded, 'utf8')
    .digest('base64');

  return calculated === hmac;
}

/**
 * Webhook handler for app uninstall
 */
app.post('/webhooks/shopify/uninstalled', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const hmac = req.get('X-Shopify-Hmac-SHA256');
    const shop = req.get('X-Shopify-Shop-API');
    
    if (!verifyWebhookHmac(req.body, hmac, SHOPIFY_CLIENT_SECRET)) {
      return res.status(401).send('Unauthorized');
    }

    console.log(`⚠️  App uninstalled from ${shop}`);
    
    // TODO: Delete store connection from database
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Server error');
  }
});

/**
 * Verify webhook HMAC
 */
function verifyWebhookHmac(body, hmac, secret) {
  const calculated = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return calculated === hmac;
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'shopify-oauth' });
});

// Start server
const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
  console.log(`\n🚀 Shopify OAuth Service running on port ${PORT}`);
  console.log(`📍 Redirect URI: ${REDIRECT_URI}`);
  console.log(`🤖 Chatbot Widget: ${CHATBOT_WIDGET_URL}\n`);
});

module.exports = app;
