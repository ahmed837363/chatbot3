// Shopify OAuth Integration
import { Databases, ID } from "https://cdn.jsdelivr.net/npm/appwrite@14.0.0/+esm";

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "YOUR_SHOPIFY_CLIENT_ID";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || "YOUR_SHOPIFY_CLIENT_SECRET";
const SHOPIFY_OAUTH_URL = "https://YOUR_STORE.myshopify.com/admin/oauth/authorize";
const SHOPIFY_TOKEN_URL = "https://YOUR_STORE.myshopify.com/admin/oauth/access_token";
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:9000/oauth/shopify/callback";

// Scopes needed for chatbot app
const SCOPES = [
  "write_products",
  "read_products",
  "read_orders",
  "read_customers",
  "write_settings",
  "read_theme_asset_modifications",
  "write_theme_asset_modifications"
];

/**
 * Generate OAuth URL for Shopify store owner to click
 * Store owner will be redirected to Shopify to authorize
 */
export function generateShopifyOAuthUrl(shopStore) {
  if (!shopStore) {
    throw new Error("Shop store name is required (e.g., mystore.myshopify.com)");
  }

  // Build authorization URL
  const authUrl = new URL(`https://${shopStore}/admin/oauth/authorize`);
  authUrl.searchParams.append("client_id", SHOPIFY_CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("scope", SCOPES.join(","));
  authUrl.searchParams.append("state", generateRandomState());

  return authUrl.toString();
}

/**
 * Exchange authorization code for access token
 * Called when store owner is redirected back from Shopify
 */
export async function exchangeCodeForToken(shopStore, authCode) {
  try {
    if (!shopStore || !authCode) {
      throw new Error("Shop store and authorization code are required");
    }

    const response = await fetch(`https://${shopStore}/admin/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        client_id: SHOPIFY_CLIENT_ID,
        client_secret: SHOPIFY_CLIENT_SECRET,
        code: authCode
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✓ Access token received from Shopify");

    return {
      accessToken: data.access_token,
      scope: data.scope,
      expiresIn: data.expires_in || null
    };
  } catch (error) {
    console.error("✗ Token exchange error:", error);
    throw error;
  }
}

/**
 * Get shop information using access token
 */
export async function getShopInfo(shopStore, accessToken) {
  try {
    const response = await fetch(`https://${shopStore}/admin/api/2024-01/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken
      },
      body: JSON.stringify({
        query: `
          query {
            shop {
              id
              name
              email
              primaryDomain {
                url
              }
            }
          }
        `
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch shop info: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    return data.data.shop;
  } catch (error) {
    console.error("✗ Error fetching shop info:", error);
    throw error;
  }
}

/**
 * Install chatbot script to Shopify theme
 */
export async function installChatbotScript(shopStore, accessToken, chatbotWidgetUrl) {
  try {
    // Get current theme
    const themeResponse = await fetch(
      `https://${shopStore}/admin/api/2024-01/themes.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken
        }
      }
    );

    const themeData = await themeResponse.json();
    const mainTheme = themeData.themes.find(t => t.role === "main");

    if (!mainTheme) {
      throw new Error("No main theme found");
    }

    // Create or update script asset
    const assetPayload = {
      asset: {
        key: "snippets/chatbot-widget.liquid",
        value: `<script src="${chatbotWidgetUrl}"></script>`
      }
    };

    const assetResponse = await fetch(
      `https://${shopStore}/admin/api/2024-01/themes/${mainTheme.id}/assets.json`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken
        },
        body: JSON.stringify(assetPayload)
      }
    );

    if (!assetResponse.ok) {
      throw new Error(`Failed to upload chatbot widget: ${assetResponse.statusText}`);
    }

    console.log("✓ Chatbot widget installed to theme");
    return { themeId: mainTheme.id, success: true };
  } catch (error) {
    console.error("✗ Error installing chatbot script:", error);
    throw error;
  }
}

/**
 * Save store connection to database
 */
export async function saveStoreConnection(db, storeData, accessToken) {
  try {
    const document = {
      platform: "shopify",
      storeName: storeData.name,
      storeEmail: storeData.email,
      storeUrl: storeData.primaryDomain?.url || "",
      accessToken: accessToken, // Store securely in production!
      connectedAt: new Date().toISOString(),
      status: "active"
    };

    const result = await db.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      "stores",
      ID.unique(),
      document
    );

    console.log("✓ Store connection saved:", result.$id);
    return result;
  } catch (error) {
    console.error("✗ Error saving store connection:", error);
    throw error;
  }
}

/**
 * Generate random state for OAuth security
 */
function generateRandomState() {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

export default {
  generateShopifyOAuthUrl,
  exchangeCodeForToken,
  getShopInfo,
  installChatbotScript,
  saveStoreConnection
};
