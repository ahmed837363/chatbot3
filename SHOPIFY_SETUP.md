# Shopify Integration Setup Guide

## Overview
This guide walks you through setting up your Shopify app so customers can click "Connect" and automatically install your chatbot on their store.

## Step 1: Create a Shopify App

### 1.1 Go to Shopify Partners Dashboard
- Visit: https://partners.shopify.com
- Sign in with your account (create one if needed - it's free!)
- Click "Create an app"

### 1.2 Create Custom App
- Choose "Create app" → "Create an app manually"
- Fill in:
  - **App name**: "AI Chatbot SaaS" (or your name)
  - **App URL**: `https://your-domain.com` (or http://localhost:9000 for testing)
  - **Allowed redirect URI**: `http://localhost:9000/oauth/shopify/callback`

### 1.3 Configure API Credentials
Once created, go to your app settings:

1. **Admin API access scopes** - Enable these:
   - `write_products`
   - `read_products`
   - `read_orders`
   - `write_settings`
   - `write_themes`
   - `read_themes`
   - `write_theme_asset_modifications`
   - `read_theme_asset_modifications`

2. **Save** and then copy your:
   - **Client ID** (API Key)
   - **Client Secret** (API Secret Password)

## Step 2: Set Environment Variables

Create a `.env` file in your project root:

```env
SHOPIFY_CLIENT_ID=your_client_id_here
SHOPIFY_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://localhost:9000/oauth/shopify/callback
CHATBOT_WIDGET_URL=https://your-domain.com/chatbot-widget.js
```

Or set them in your system:

### Windows (PowerShell):
```powershell
$env:SHOPIFY_CLIENT_ID = "your_client_id"
$env:SHOPIFY_CLIENT_SECRET = "your_client_secret"
```

### Linux/Mac:
```bash
export SHOPIFY_CLIENT_ID="your_client_id"
export SHOPIFY_CLIENT_SECRET="your_client_secret"
```

## Step 3: Update Configuration Files

### Update `shopify-oauth.js`:
```javascript
// Change these lines to use your credentials
const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || "YOUR_SHOPIFY_CLIENT_ID";
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || "YOUR_SHOPIFY_CLIENT_SECRET";
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:9000/oauth/shopify/callback";
const CHATBOT_WIDGET_URL = process.env.CHATBOT_WIDGET_URL || "https://your-domain.com/chatbot-widget.js";
```

### Update `shopify-app-manifest.json`:
Replace these values:
- `YOUR_STORE` - Your store name (e.g., mystore.myshopify.com)
- `your-domain.com` - Your actual domain
- `support@chatbot.example.com` - Your support email

## Step 4: Files Structure

Your Shopify integration now includes:

```
src/
  ├── shopify-oauth.js          # OAuth flow & API calls
  └── salla-oauth.js            # (existing)

shopify-app-manifest.json        # App configuration for Shopify
shopify-connect.html             # UI for customers to connect

desktop-app/
  └── main.js                    # Updated with Shopify handlers

functions/
  └── shopify-webhook/           # (for future webhook handling)
```

## Step 5: How the Flow Works

### For Your Customer:

1. **Customer visits your app** → Clicks "Connect with Shopify"
2. **Enters store name** → "mystore" (for mystore.myshopify.com)
3. **Redirected to Shopify** → Shopify login & authorization
4. **Grant permissions** → Review requested permissions
5. **Auto-redirect** → Back to your app
6. **Chatbot installed** → Widget appears on customer's store ✅

### Behind the Scenes:

```
Customer clicks → OAuth URL generated → Shopify authorization
                     ↓
              Authorization code returned
                     ↓
            Code exchanged for access token
                     ↓
              Get shop info (name, email, domain)
                     ↓
        Install chatbot widget to theme
                     ↓
        Save connection to database
```

## Step 6: Test It Locally

### 1. Start your app:
```bash
npm start
```

### 2. Open the Shopify connect page:
```
http://localhost:9000/shopify-connect.html
```

### 3. Enter a test store:
- Use a development store from your Shopify Partners account
- Or test mode (doesn't require authorization)

## Step 7: Deploy to Production

When ready to go live:

1. **Update domain**: Change `http://localhost:9000` to your actual domain
2. **Set environment variables** on your hosting platform
3. **Update Shopify app settings**:
   - Change redirect URI to: `https://your-domain.com/oauth/shopify/callback`
   - Update app URL: `https://your-domain.com`

4. **Update `shopify-app-manifest.json`**:
   - Change all URLs to use your domain
   - Change webhook URLs if applicable

## Files Included

### 1. **src/shopify-oauth.js**
Core OAuth functions:
- `generateShopifyOAuthUrl(shopStore)` - Creates auth URL
- `exchangeCodeForToken(shopStore, authCode)` - Gets access token
- `getShopInfo(shopStore, accessToken)` - Fetches store details
- `installChatbotScript(shopStore, accessToken, widgetUrl)` - Installs widget

### 2. **shopify-connect.html**
Beautiful UI with:
- Store name input field
- Features list
- Error/success messages
- Loading states
- FAQ section
- Test mode button

### 3. **shopify-app-manifest.json**
Shopify app configuration:
- App metadata
- API scopes
- Webhook endpoints
- Billing (optional)

### 4. **Updated main.js**
New handlers:
- `start-oauth` - IPC handler for OAuth
- `shopify-get-auth-url` - Generates OAuth URL
- Updated OAuth callback server for Shopify

## Security Best Practices

⚠️ **Important**: Never commit credentials to Git!

```bash
# Add to .gitignore
.env
.env.local
.env.*.local
```

## Troubleshooting

### "Invalid redirect URI"
- Make sure redirect URI in Shopify matches exactly: `http://localhost:9000/oauth/shopify/callback`
- For production: `https://your-domain.com/oauth/shopify/callback`

### "Client ID not found"
- Check environment variables are set correctly
- Verify credentials from Shopify Partners dashboard

### Chatbot not appearing on store
- Check theme permissions were granted
- Verify chatbot widget URL is correct
- Check browser console for errors

### CORS errors
- Add your domain to Shopify CORS settings
- Or ensure requests come from server-side

## Next Steps

1. ✅ Create Shopify Partner account
2. ✅ Create custom app
3. ✅ Get Client ID & Secret
4. ✅ Set environment variables
5. ✅ Test locally
6. ✅ Deploy to production

## Support

For issues:
- Check Shopify API docs: https://shopify.dev/docs/admin-api
- Review error messages in browser console
- Check server logs in terminal

---

**Ready to go live?** Update domain names and deploy! 🚀
