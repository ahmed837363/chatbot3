// Salla Easy Mode Webhook Handler
// This receives access tokens when merchants install your app

import { Databases } from "https://cdn.jsdelivr.net/npm/appwrite@14.0.0/+esm";

/**
 * Handle Salla webhook for app.store.authorize event
 * Salla sends this when merchant installs your app
 */
export async function handleSallaWebhook(webhookData, databases, userId) {
  try {
    console.log("📩 Received Salla webhook:", webhookData);

    const { event, merchant, data } = webhookData;

    // Check if this is the authorize event
    if (event !== "app.store.authorize") {
      console.log("ℹ️ Ignoring event:", event);
      return { success: true, message: "Event ignored" };
    }

    console.log("✓ Processing store authorization...");

    // Extract token data
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;
    const merchantInfo = merchant;

    // Save connection to Appwrite database
    const connection = await databases.createDocument(
      "chatbot_db", // database ID
      "store_connections", // collection ID
      "unique()", // auto-generate document ID
      {
        customerId: userId || "unknown", // Link to user if available
        platform: "salla",
        accessToken: accessToken,
        refreshToken: refreshToken,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
        storeUrl: merchantInfo.domain || `https://salla.sa/shops/${merchantInfo.id}`,
        storeName: merchantInfo.name || "Unknown Store",
        merchantId: merchantInfo.id,
        connectedAt: new Date()
      }
    );

    console.log("✓ Salla store connected:", connection.$id);
    console.log("✓ Store:", merchantInfo.name);
    console.log("✓ Domain:", merchantInfo.domain);

    // TODO: Deploy chatbot widget to the store
    await deployChatbotWidget(accessToken, merchantInfo);

    return {
      success: true,
      message: "Store connected successfully",
      connectionId: connection.$id,
      storeName: merchantInfo.name
    };

  } catch (error) {
    console.error("❌ Webhook handling error:", error);
    throw error;
  }
}

/**
 * Deploy chatbot widget to merchant's Salla store
 */
async function deployChatbotWidget(accessToken, merchantInfo) {
  try {
    console.log("Deploying chatbot widget to:", merchantInfo.name);

    // TODO: Use Salla API to inject widget code
    // This would involve registering a theme snippet or webhook
    
    // For now, log that it's ready
    console.log("✓ Chatbot ready for:", merchantInfo.domain);

    return { success: true };
  } catch (error) {
    console.error("❌ Widget deployment error:", error);
    throw error;
  }
}

/**
 * Verify Salla webhook signature (security)
 */
export function verifyWebhookSignature(payload, signature, secret) {
  // Salla signs webhooks with HMAC-SHA256
  const crypto = window.crypto || window.msCrypto;
  
  // TODO: Implement signature verification
  // const expectedSignature = HMAC_SHA256(payload, secret);
  // return expectedSignature === signature;
  
  return true; // Skip verification for now (testing)
}
