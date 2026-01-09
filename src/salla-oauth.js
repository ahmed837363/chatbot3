// Salla OAuth Integration
import { Databases, ID } from "https://cdn.jsdelivr.net/npm/appwrite@14.0.0/+esm";

const SALLA_CLIENT_ID = "a528b4f5-ed26-4a09-8aba-036938afa894";
const SALLA_CLIENT_SECRET = "148151133bbcfab7589a35da9e69158ff4a18cbdc0212627165b22226bbc6614";
const SALLA_OAUTH_URL = "https://accounts.salla.sa/oauth2/auth";
const SALLA_TOKEN_URL = "https://accounts.salla.sa/oauth2/token";
const REDIRECT_URI = "https://6948f4cc003d4c022adb.fra.appwrite.run/";

/**
 * Generate OAuth URL for merchant to click
 * Merchant will be redirected to Salla to login and authorize
 */
export function generateSallaOAuthUrl() {
  const params = new URLSearchParams({
    client_id: SALLA_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "offline_access"
  });

  return `${SALLA_OAUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * This is called when merchant is redirected back from Salla
 */
export async function exchangeCodeForToken(authCode) {
  try {
    const response = await fetch(SALLA_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: SALLA_CLIENT_ID,
        client_secret: SALLA_CLIENT_SECRET,
        code: authCode,
        redirect_uri: REDIRECT_URI
      })
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✓ Token received from Salla:", data);

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      merchantId: data.merchant_id // Salla returns merchant info
    };
  } catch (error) {
    console.error("❌ Token exchange error:", error);
    throw error;
  }
}

/**
 * Store Salla connection in Appwrite database
 */
export async function saveSallaConnection(databases, userId, tokenData) {
  try {
    const doc = await databases.createDocument(
      "6946699d001194236820", // database ID
      "store_connections", // collection ID
      ID.unique(), // auto-generate doc ID
      {
        customerId: userId,
        platform: "salla",
        accessToken: tokenData.accessToken,
        refreshToken: tokenData.refreshToken,
        expiresAt: new Date(Date.now() + tokenData.expiresIn * 1000),
        storeUrl: `https://salla.sa/shops/${tokenData.merchantId}`,
        connectedAt: new Date()
      }
    );

    console.log("✓ Salla connection saved:", doc.$id);
    return doc;
  } catch (error) {
    console.error("❌ Failed to save connection:", error);
    throw error;
  }
}

/**
 * Get merchant's Salla store info via API
 */
export async function getSallaStoreInfo(accessToken) {
  try {
    const response = await fetch("https://api.salla.dev/v2/shops/@me", {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch store info: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("✓ Store info:", data);
    return data;
  } catch (error) {
    console.error("❌ Failed to get store info:", error);
    throw error;
  }
}

/**
 * Deploy chatbot widget to merchant's Salla store
 * This would involve registering a webhook or updating store settings
 */
export async function deployChatbotToStore(accessToken, chatbotConfig) {
  try {
    // Implementation would depend on Salla's API for adding custom code/widgets
    // For now, we'll register a webhook to track store events
    
    console.log("Deploying chatbot with config:", chatbotConfig);
    // TODO: Call Salla API to inject widget code
    
    return { success: true };
  } catch (error) {
    console.error("❌ Failed to deploy chatbot:", error);
    throw error;
  }
}
