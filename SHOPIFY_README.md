# Shopify Chatbot Integration - Quick Start

## 📋 What You Get

Your customers can now click a **"Connect with Shopify"** button and:
1. ✅ Authenticate with their Shopify store
2. ✅ Grant permissions automatically
3. ✅ Chatbot widget installs on their site instantly
4. ✅ Start answering customer questions 24/7

## 🚀 Quick Start (5 minutes)

### 1. **Get Shopify Credentials** (2 min)
```bash
# Go to: https://partners.shopify.com
# 1. Sign up/Log in
# 2. Create an app → "Create app manually"
# 3. Copy these values:
#    - Client ID (API Key)
#    - Client Secret (API Secret Password)
```

### 2. **Set Environment Variables** (1 min)
Create `.env` file in project root:
```env
SHOPIFY_CLIENT_ID=your_client_id_here
SHOPIFY_CLIENT_SECRET=your_client_secret_here
REDIRECT_URI=http://localhost:9000/oauth/shopify/callback
CHATBOT_WIDGET_URL=https://your-domain.com/chatbot-widget.js
```

### 3. **Install Dependencies** (1 min)
```bash
# From project root
npm install

# Install OAuth server dependencies
cd ..
npm install express cors dotenv axios
```

### 4. **Start the App** (1 min)
```bash
# Start your main app (Electron/Node)
npm start

# In another terminal, start OAuth server
node shopify-oauth-server.js
```

### 5. **Test It**
Open: `http://localhost:9000/shopify-connect.html`
- Enter store name: `mystore` (for mystore.myshopify.com)
- Click "Connect with Shopify"
- You'll be redirected to authorize
- Chatbot installs automatically! ✅

---

## 📁 What's New

| File | Purpose |
|------|---------|
| `shopify-oauth.js` | OAuth flow functions (frontend) |
| `shopify-oauth-server.js` | OAuth server (backend) |
| `shopify-connect.html` | Beautiful "Connect" button UI |
| `shopify-app-manifest.json` | Shopify app configuration |
| `SHOPIFY_SETUP.md` | Detailed setup guide |
| `shopify-oauth-server-package.json` | Server dependencies |

---

## 🔑 How It Works

```
┌─────────────────────────────────────────────────────┐
│ Customer's Browser                                   │
│                                                      │
│  Clicks "Connect with Shopify"                      │
│           ↓                                          │
│  Enters: mystore.myshopify.com                      │
│           ↓                                          │
│  Redirected to Shopify for login                    │
│           ↓                                          │
│  Approves permissions (auto-approved)               │
│           ↓                                          │
│  Shopify redirects back with authorization code     │
│           ↓                                          │
└──────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ Your OAuth Server (shopify-oauth-server.js)         │
│                                                      │
│  Receives: code + shop parameter                    │
│           ↓                                          │
│  Exchanges code for ACCESS TOKEN                    │
│           ↓                                          │
│  Gets shop info (name, email, domain)               │
│           ↓                                          │
│  Installs chatbot widget to theme                   │
│           ↓                                          │
│  Saves store connection to database                 │
│           ↓                                          │
│  Redirects customer: "Success! ✅"                  │
│                                                      │
└──────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ Customer's Shopify Store                            │
│                                                      │
│  ✅ Chatbot widget appears on website               │
│  ✅ Ready to chat with customers                    │
│  ✅ Handles support requests automatically          │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 🧪 Testing Modes

### Mode 1: Real Shopify Store
```
1. Use a real store: mystore.myshopify.com
2. Will prompt for Shopify login
3. Requires actual Shopify credentials
```

### Mode 2: Development Store
```
1. Create one free in Shopify Partners
2. Use: dev-store-name.myshopify.com
3. Pre-authorized for testing
```

### Mode 3: Test Mode (No Auth Required)
```
1. Click "Try Test Mode" button
2. Simulates successful installation
3. Perfect for UI/UX testing
```

---

## 🔐 Security Features

✅ **HMAC Validation** - Verifies requests from Shopify  
✅ **State Parameter** - Prevents CSRF attacks  
✅ **Secure Token Exchange** - Uses client secret  
✅ **HTTPS Only** (in production)  
✅ **Scoped Permissions** - Only requests needed access  

---

## 📱 Responsive Design

The connect page works on:
- ✅ Desktop (1920px+)
- ✅ Tablet (768px+)
- ✅ Mobile (320px+)
- ✅ Dark mode support

---

## ⚙️ Configuration

### Update Shopify App Settings
In Shopify Partners dashboard:
1. **Redirect URI**: `http://localhost:9000/oauth/shopify/callback`
2. **App URL**: `https://your-domain.com`
3. **API Scopes**: Enabled all recommended scopes

### Update OAuth Server
Edit `shopify-oauth-server.js`:
```javascript
// Change these to your domain
const REDIRECT_URI = 'https://your-domain.com/oauth/shopify/callback';
const CHATBOT_WIDGET_URL = 'https://your-domain.com/chatbot-widget.js';
```

### Update HTML Page
Edit `shopify-connect.html`:
```javascript
const API_BASE = "https://your-domain.com"; // Change from localhost
```

---

## 🛠️ Troubleshooting

### "Invalid redirect URI"
```
✓ Make sure URI matches Shopify app settings exactly
✓ Check for trailing slashes
✓ Use http:// for localhost, https:// for production
```

### "Client ID not found"
```
✓ Verify .env file exists and is readable
✓ Check environment variables are set
✓ Restart the app after changing .env
```

### Chatbot not appearing on store
```
✓ Check theme permissions were granted
✓ Verify widget URL is accessible
✓ Check browser console for errors
✓ Clear theme cache (Shopify admin → Themes → Edit)
```

### CORS errors
```
✓ Add your domain to OAuth server CORS settings
✓ Check API requests are from correct origin
✓ Use environment variables for domain
```

---

## 📊 Database Integration

The OAuth server saves store connections. Update the database:

### With Appwrite:
```javascript
// In shopify-oauth-server.js, update saveStoreConnection()
const { Client, Databases } = require('appwrite');

async function saveStoreConnection(storeData) {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);
  
  return await databases.createDocument(
    process.env.APPWRITE_DATABASE_ID,
    'stores',
    ID.unique(),
    {
      platform: 'shopify',
      ...storeData
    }
  );
}
```

### With MongoDB:
```javascript
const Store = require('./models/Store');

async function saveStoreConnection(storeData) {
  return await Store.create({
    platform: 'shopify',
    ...storeData
  });
}
```

### With PostgreSQL:
```javascript
const db = require('./db');

async function saveStoreConnection(storeData) {
  const result = await db.query(
    'INSERT INTO stores (platform, shop, access_token, ...) VALUES ($1, $2, $3, ...)',
    ['shopify', storeData.shop, storeData.accessToken, ...]
  );
  return result.rows[0];
}
```

---

## 🌍 Deploy to Production

### Update Configuration
```bash
# 1. Change environment variables
export SHOPIFY_CLIENT_ID="prod_client_id"
export SHOPIFY_CLIENT_SECRET="prod_client_secret"
export REDIRECT_URI="https://your-domain.com/oauth/shopify/callback"

# 2. Update Shopify app settings
# - Redirect URI: https://your-domain.com/oauth/shopify/callback
# - App URL: https://your-domain.com

# 3. Update manifest
# - Change all http:// to https://
# - Update domain references
```

### Deploy OAuth Server
```bash
# Using Vercel (recommended for serverless)
npm i -g vercel
vercel deploy

# Using Heroku
git push heroku main

# Using your own server
pm2 start shopify-oauth-server.js
# or
docker build -t shopify-oauth .
docker run -p 9000:9000 shopify-oauth
```

---

## 📚 Files Reference

### `shopify-oauth.js` (Frontend Functions)
```javascript
generateShopifyOAuthUrl(shopStore)      // Create auth URL
exchangeCodeForToken(shopStore, code)   // Get access token  
getShopInfo(shopStore, token)          // Fetch store details
installChatbotScript(shopStore, token) // Install widget
saveStoreConnection(db, data, token)   // Save to database
```

### `shopify-oauth-server.js` (Backend API)
```
POST   /oauth/shopify/auth-url          # Generate auth URL
GET    /oauth/shopify/callback          # Handle OAuth callback
POST   /webhooks/shopify/uninstalled    # Handle app uninstall
GET    /health                          # Health check
```

### `shopify-connect.html` (Frontend UI)
```
- Beautiful responsive design
- Store name input validation
- Error/success messages
- Loading states
- FAQ section
- Test mode button
```

---

## 💡 Pro Tips

1. **Use development store first** - No live traffic while testing
2. **Test on mobile** - Check responsive design
3. **Monitor API rate limits** - Shopify has request limits
4. **Cache theme data** - Reduce API calls
5. **Add analytics** - Track successful installs
6. **Webhook validation** - Always verify HMAC
7. **Graceful degradation** - Handle network errors

---

## 🎯 Next Steps

- [ ] Set up Shopify Partner account
- [ ] Create custom app in Shopify
- [ ] Copy Client ID & Secret  
- [ ] Create `.env` file
- [ ] Run OAuth server
- [ ] Test with store
- [ ] Deploy to production
- [ ] Monitor installations
- [ ] Gather customer feedback

---

## 📞 Support

Need help? Check:
1. [SHOPIFY_SETUP.md](SHOPIFY_SETUP.md) - Detailed setup guide
2. [Shopify API Docs](https://shopify.dev/docs/admin-api)
3. Browser console errors
4. Server logs (terminal)

---

## 📄 License

MIT - Feel free to use and modify!

---

**Questions?** Edit this file or contact support.

Generated: December 2025
Last updated: 2025-12-25
