import { Client, Databases, ID } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  if (req.method === "GET") {
    log(" Webhook endpoint ready");
    return res.text("Webhook endpoint ready", 200);
  }
  
  if (req.method !== "POST") {
    return res.json({ error: "Method not allowed" }, 405);
  }

  try {
    log(" Received Salla webhook");
    const webhookData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    log("Event type: " + webhookData.event);
    log("Merchant: " + webhookData.merchant?.name);

    if (webhookData.event !== "app.store.authorize") {
      log("? Ignoring event: " + webhookData.event);
      return res.json({ success: true, message: "Event ignored" });
    }

    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const { merchant, data, created_at } = webhookData;
    const merchantId = merchant.id;
    const merchantName = merchant.name || "Unknown Store";
    const merchantDomain = merchant.domain || "";
    const merchantEmail = merchant.email || "";
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    const expiresIn = data.expires_in;

    log(" Processing store authorization...");

    const connectionId = ID.unique();
    const connectionDoc = await databases.createDocument(
      "6946699d001194236820",
      "store_connections",
      connectionId,
      {
        storeConnectionId: merchantId,
        merchantId: merchantId,
        createdDate: new Date().toISOString()
      }
    );

    log(" Store connected: " + connectionDoc.$id);
    log(" Store Name: " + merchantName);
    log(" Domain: " + merchantDomain);

    return res.json({
      success: true,
      message: " Store connected and chatbot installed! ",
      connectionId: connectionDoc.$id,
      storeName: merchantName,
      widgetUrl: "https://cdn.jsdelivr.net/gh/ahmed837363/chatbot3@main/chatbot-widget.js"
    }, 200);

  } catch (err) {
    log(" Error: " + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
