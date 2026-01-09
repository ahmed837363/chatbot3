# 🤖 AI Smart Assistant - علام

> Intelligent AI chatbot for Salla e-commerce stores powered by ALLaM (Saudi AI model)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE (Edge Network)                        │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Cloudflare Worker                             │    │
│  │  • /salla/webhook → Appwrite Function                           │    │
│  │  • /v1/* → Local AI (via Tunnel)                                │    │
│  │  URL: https://ai-smart-assistant.YOUR-SUBDOMAIN.workers.dev     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Cloudflare Tunnel                             │    │
│  │  • Connects local PC to internet securely                       │    │
│  │  • Permanent URL: https://allam-ai.mayasahstyle.me              │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┴───────────────────────┐
            ▼                                               ▼
┌─────────────────────────┐                   ┌─────────────────────────┐
│      APPWRITE           │                   │    LOCAL PC             │
│  (Database + Functions) │                   │  (Your Computer)        │
│                         │                   │                         │
│  • Store connections    │                   │  ┌─────────────────┐   │
│  • Cached products      │                   │  │   LM Studio     │   │
│  • Cached shipping      │                   │  │   + ALLaM AI    │   │
│  • Cached coupons       │                   │  │                 │   │
│  • Access tokens        │                   │  │ 192.168.1.4:1234│   │
│                         │                   │  └─────────────────┘   │
└─────────────────────────┘                   └─────────────────────────┘
            ▲                                               ▲
            │                                               │
┌───────────┴───────────┐                   ┌───────────────┴───────────┐
│    SALLA PLATFORM     │                   │     CUSTOMER BROWSER      │
│                       │                   │                           │
│  • Sends webhooks     │                   │  ┌─────────────────────┐ │
│  • OAuth tokens       │                   │  │   Chatbot Widget    │ │
│  • Store events       │                   │  │   (JavaScript)      │ │
│                       │                   │  └─────────────────────┘ │
└───────────────────────┘                   └───────────────────────────┘
```

---

## 🛠️ Technology Stack

### ☁️ Cloudflare (Edge Layer)

| Component | Purpose |
|-----------|---------|
| **Cloudflare Worker** | Main entry point. Routes webhook requests to Appwrite and AI requests to local LM Studio. Provides CORS headers and handles all HTTP routing. |
| **Cloudflare Tunnel** | Creates a secure tunnel from the internet to your local PC. Allows the chatbot to reach LM Studio without port forwarding or exposing your IP. |

**Why Cloudflare?**
- ✅ Free tier is generous
- ✅ Global edge network (fast everywhere)
- ✅ Built-in DDoS protection
- ✅ Tunnels don't need static IP
- ✅ Permanent URLs (no ngrok-style random URLs)

---

### 🗄️ Appwrite (Backend)

| Component | Purpose |
|-----------|---------|
| **Database** | Stores merchant connections, access tokens, and cached store data (products, shipping, coupons, offers) |
| **Functions** | Serverless functions that handle Salla webhooks and process OAuth tokens |

**Why Appwrite?**
- ✅ Free tier with generous limits
- ✅ Built-in database with REST API
- ✅ Serverless functions included
- ✅ Easy to use console
- ✅ Open source

**Database Structure:**
```
Collection: store_connections
├── merchantId (string) - Salla store ID
├── storeName (string) - Store name
├── accessToken (string) - Salla API token
├── refreshToken (string) - For token refresh
├── tokenExpiresAt (string) - Token expiry
├── cachedProducts (string) - JSON array of products
├── cachedShipping (string) - JSON array of shipping zones
├── cachedCoupons (string) - JSON array of active coupons
├── cachedOffers (string) - JSON array of special offers
├── cacheLastUpdated (string) - Last cache update time
├── installedAt (string) - App installation date
└── isActive (boolean) - Is app still installed
```

---

### 🤖 LM Studio + ALLaM (Local AI)

| Component | Purpose |
|-----------|---------|
| **LM Studio** | Desktop app that runs AI models locally on your GPU |
| **ALLaM Model** | Saudi AI model trained for Arabic/Saudi dialect |

**Why Local AI?**
- ✅ No API costs
- ✅ Complete privacy
- ✅ No rate limits
- ✅ Customizable
- ✅ Works offline (except tunnel)

**Model Details:**
- **Name:** `allam-7b-instruct-preview`
- **Format:** GGUF (Q4_K_M quantization)
- **Size:** ~4GB VRAM
- **Server:** OpenAI-compatible API at `http://192.168.1.4:1234`

---

### 🛒 Salla Platform

| Component | Purpose |
|-----------|---------|
| **Salla Partners** | Where you register your app and configure OAuth/webhooks |
| **App Snippets** | Injects the chatbot widget into merchant stores |
| **Webhooks** | Sends events when stores install/uninstall your app |

**OAuth Mode: Easy Mode**
- Tokens are sent directly via `app.store.authorize` webhook
- No need for callback URL handling
- Simpler integration

---

## 📁 Project Structure

```
chatbot final/
├── chatbot-widget.js          # Main widget (injected into Salla stores)
├── README.md                  # This file
├── cloudflare-worker/
│   ├── index.js               # Cloudflare Worker code
│   ├── wrangler.toml          # Cloudflare config
│   └── README.md              # Worker docs
├── functions/
│   └── salla-webhook/
│       ├── src/index.js       # Appwrite function (webhook handler)
│       ├── package.json       # Dependencies
│       └── function.tar.gz    # Ready-to-deploy package
└── start-tunnel.bat           # Windows script to start tunnel
```

---

## 🔐 Credentials & URLs

### Salla App (NEW)
| Key | Value |
|-----|-------|
| Client ID | `b6b5fbb1-a9e5-4fe3-9257-281d1006f509` |
| Client Secret | `d54bf327ea17bcf3419eb5234b19506dfb6180e1746265e11b4beb8fae991ab9` |
| OAuth Mode | Easy Mode |
| Webhook URL | `https://mayasahstyle.me/salla/webhook` |

### Appwrite
| Key | Value |
|-----|-------|
| Project ID | `694669640010920ea3f6` |
| Database ID | `6946699d001194236820` |
| Collection | `store_connections` |

### Cloudflare Tunnel
| Key | Value |
|-----|-------|
| Tunnel Name | `allam-ai` |
| Tunnel URL | `https://allam-ai.mayasahstyle.me` |
| Config File | `C:\Users\USER\.cloudflared\config.yml` |

---

## 🚀 How It Works

### 1. Store Installs App
```
Merchant clicks "Install" → Salla sends webhook → 
Cloudflare Worker → Appwrite Function → 
Saves token + fetches products → Database
```

### 2. Customer Opens Chat
```
Customer visits store → Widget loads → 
Fetches store data from Appwrite → 
Ready to answer questions
```

### 3. Customer Asks Question
```
Customer types message → Widget sends to Cloudflare → 
Cloudflare Tunnel → LM Studio (ALLaM) → 
AI responds with product knowledge
```

---

## 🖥️ Starting the System

### Prerequisites
- [ ] LM Studio running with ALLaM model
- [ ] Cloudflare Tunnel running
- [ ] Appwrite function deployed

### Start Commands

**1. Start LM Studio:**
- Open LM Studio
- Load `allam-7b-instruct-preview` model
- Start server on port 1234

**2. Start Cloudflare Tunnel:**
```bash
# Option A: Run directly
cloudflared tunnel run allam-ai

# Option B: Use batch file
start-tunnel.bat
```

**3. Verify Everything:**
```bash
# Test tunnel
curl https://allam-ai.mayasahstyle.me/v1/models

# Test Appwrite
curl https://fra.cloud.appwrite.io/v1/databases/6946699d001194236820/collections/store_connections/documents \
  -H "X-Appwrite-Project: 694669640010920ea3f6"
```

---

## 📝 App Snippet Code

Add this in Salla Partners → App Snippets:

```html
<script src="https://raw.githubusercontent.com/ahmed837363/chatbot3/main/chatbot-widget.js" data-store-id="{{store.id}}"></script>
```

The `{{store.id}}` will be automatically replaced with each merchant's store ID.

---

## 🌐 Widget Features

- ✅ Bilingual (Arabic / English)
- ✅ Language switch button
- ✅ Saudi dialect responses
- ✅ Knows products & prices
- ✅ Knows shipping info
- ✅ Suggests coupons
- ✅ 24/7 availability
- ✅ Mobile responsive

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Chatbot not responding | Check if LM Studio and Tunnel are running |
| CORS errors | Make sure Cloudflare Worker has CORS headers |
| 401 Unauthorized | Check Appwrite permissions (Any → Read) |
| Products not showing | Reinstall app to refresh cached data |
| Tunnel not connecting | Run `cloudflared tunnel run allam-ai` |

---

## 📄 License

MIT License - Free to use and modify

---

## 🤝 Support

For issues or questions, check the Salla Partners documentation or Appwrite docs.
