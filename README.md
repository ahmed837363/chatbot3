# 🤖 Salla AI Chatbot - Complete System Documentation

## 📋 Overview

An AI-powered chatbot for Salla e-commerce stores that speaks Saudi Arabic dialect using ALLaM (Saudi AI model).

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Salla Store   │────▶│  Chatbot Widget  │────▶│ Cloudflare      │
│   (Customer)    │     │  (JavaScript)    │     │ Tunnel          │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Appwrite      │◀────│  Salla Webhook   │◀────│ LM Studio       │
│   Database      │     │  (Appwrite Fn)   │     │ + ALLaM AI      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

---

## 🛠️ Apps & Services Used

### 1. **LM Studio** (Local AI)
- **Purpose:** Run ALLaM AI model locally
- **Model:** `allam-7b-instruct-preview` (Q4_K_M GGUF)
- **URL:** `http://192.168.1.4:1234`
- **Status:** Must be running 24/7 for chatbot to work

### 2. **Cloudflare Tunnel** (Permanent URL)
- **Purpose:** Expose local LM Studio to the internet
- **Tunnel Name:** `allam-ai`
- **Permanent URL:** `https://allam-ai.mayasahstyle.me`
- **Config File:** `C:\Users\USER\.cloudflared\config.yml`
- **Credentials:** `C:\Users\USER\.cloudflared\594161db-7983-43db-8d79-cd1254bf269f.json`

### 3. **Appwrite** (Backend)
- **Purpose:** Database + Serverless Functions
- **Console:** https://cloud.appwrite.io
- **Project ID:** `6947cbfb000c6b2bfd1c`
- **Database ID:** `6946699d001194236820`
- **Collection:** `store_connections`

### 4. **Salla Partner Portal**
- **Purpose:** App registration & OAuth
- **URL:** https://portal.salla.partners
- **App Client ID:** `a528b4f5-ed26-4a09-8aba-036938afa894`
- **OAuth Mode:** Custom Mode
- **Callback URL:** `https://695e4b870024fb66ce24.fra.appwrite.run/`

### 5. **GitHub** (Code Hosting)
- **Purpose:** Host widget code via jsDelivr CDN
- **Repo:** `ahmed837363/chatbot3`
- **Widget CDN:** `https://cdn.jsdelivr.net/gh/ahmed837363/chatbot3@main/chatbot-widget.js`

### 6. **Cloudflare Workers** (Optional Backup)
- **Purpose:** Cloud AI fallback (if local AI is down)
- **URL:** `https://ai-chat-worker.252001168.workers.dev`
- **Status:** Needs Groq API key for full functionality

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `chatbot-widget.js` | Main widget injected into Salla stores |
| `functions/salla-webhook/functions/hey/src/main.js` | OAuth + Store data caching |
| `functions/salla-webhook/functions/hey2/src/main.js` | Daily refresh scheduler |
| `cloudflare-worker-ai/index.js` | Cloud AI backup worker |
| `C:\Users\USER\.cloudflared\config.yml` | Cloudflare tunnel config |

---

## 🔄 Workflow

### When Store Installs App:
1. Merchant installs app from Salla App Store
2. Salla sends OAuth callback to Appwrite function
3. Function exchanges code for access token
4. Function fetches products, shipping, coupons, offers from Salla API
5. Data cached in Appwrite database
6. Widget auto-injected via Salla App Snippets

### When Customer Chats:
1. Customer clicks chat bubble on store
2. Widget loads cached store data from Appwrite
3. Widget sends message to ALLaM via Cloudflare Tunnel
4. ALLaM responds with Saudi dialect + product knowledge
5. Response displayed to customer

### Daily Refresh (6 AM):
1. Appwrite scheduled function runs
2. Fetches latest products/coupons/offers for all stores
3. Updates cached data in database
4. Chatbot always has fresh product info

---

## 🚀 Startup Commands

### Start LM Studio:
1. Open LM Studio
2. Load model: `allam-7b-instruct-preview`
3. Start server on port 1234

### Start Cloudflare Tunnel:
```powershell
npx cloudflared tunnel run allam-ai
```

Or use the startup script (see below).

---

## 🔧 Auto-Start on Windows Boot

### Create Startup Script:
Save as `C:\Users\USER\Desktop\start-chatbot.bat`:
```batch
@echo off
echo Starting Cloudflare Tunnel for ALLaM AI...
npx cloudflared tunnel run allam-ai
```

### Add to Windows Startup:
1. Press `Win + R`
2. Type `shell:startup`
3. Create shortcut to `start-chatbot.bat`

---

## 🔑 API Keys & Secrets

| Service | Key Location |
|---------|--------------|
| Salla Client Secret | In Appwrite function code |
| Appwrite API Key | Appwrite function environment variable |
| Cloudflare API Token | `Vk1EbzElUSMiUfnEhNzjO68XCGlLFz66ZeHbX7Gv` |
| Cloudflare Tunnel Credentials | `C:\Users\USER\.cloudflared\*.json` |

---

## 📊 Appwrite Database Schema

### Collection: `store_connections`

| Field | Type | Description |
|-------|------|-------------|
| `storeConnectionId` | String | Salla store ID |
| `merchantId` | String | Merchant ID |
| `storeName` | String | Store name |
| `domain` | String | Store domain |
| `email` | String | Merchant email |
| `platform` | String | "salla" |
| `accessToken` | String | Salla API token |
| `refreshToken` | String | Refresh token |
| `expiresAt` | String | Token expiry |
| `connectedAt` | String | Connection date |
| `status` | String | "active" |
| `widgetInjected` | Boolean | Widget status |
| `cachedProducts` | String | JSON products (100KB max) |
| `cachedShipping` | String | JSON shipping zones |
| `cachedCoupons` | String | JSON active coupons |
| `cachedOffers` | String | JSON special offers |
| `cacheLastUpdated` | String | Last cache update |

---

## 🔗 URLs Reference

| Purpose | URL |
|---------|-----|
| ALLaM AI (Tunnel) | `https://allam-ai.mayasahstyle.me` |
| Webhook Function | `https://695e4b870024fb66ce24.fra.appwrite.run/` |
| Daily Refresh Function | `https://695e51c6003a42e8f3b5.fra.appwrite.run/` |
| Widget CDN | `https://cdn.jsdelivr.net/gh/ahmed837363/chatbot3@main/chatbot-widget.js` |
| Backup AI Worker | `https://ai-chat-worker.252001168.workers.dev` |
| Appwrite Console | `https://cloud.appwrite.io` |
| Salla Partners | `https://portal.salla.partners` |
| Cloudflare Dashboard | `https://dash.cloudflare.com` |

---

## ⚠️ Important Notes

1. **PC must be ON** - Your computer needs to be running for the AI to work
2. **LM Studio must be running** - Start it before opening your store
3. **Tunnel must be active** - Run cloudflared or use the startup script
4. **Token expiry** - Salla tokens expire, but refresh tokens should auto-renew

---

## 🐛 Troubleshooting

### Chatbot not responding:
1. Check if LM Studio is running
2. Check if Cloudflare tunnel is active
3. Test URL: `https://allam-ai.mayasahstyle.me/v1/models`

### Store data not showing:
1. Check Appwrite for cached data
2. Manually trigger refresh: `https://695e51c6003a42e8f3b5.fra.appwrite.run/`

### Widget not appearing:
1. Check if App Snippets is enabled in Salla Partner Portal
2. Verify widget code in store's custom scripts

---

## 📅 Last Updated
January 8, 2026
