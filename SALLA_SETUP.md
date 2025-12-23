# Chatbot SaaS - Salla Integration Setup

## Current Status

✅ **Working:**
- Webhook function receives Salla events
- Desktop app manages stores
- Widget code created and tested
- Test page working locally

❌ **Need to Setup:**
- Salla app registration with widget injection
- Salla Partners app configuration
- Widget auto-injection on Salla stores

---

## How to Make Widget Show on Salla Demo Store

### Option 1: Use Salla App Store (Proper Way) ⭐ RECOMMENDED

1. **Register App with Salla:**
   - Go to [Salla Partners](https://partners.salla.sa)
   - Click "My Apps" → "Add New App"
   - Fill in:
     - App Name: "Chatbot SaaS"
     - Description: "AI-powered chatbot for customer support"
     - Category: "Tools & Utilities"
     - Icon: Upload your logo
     - App URL: `https://your-domain.com/dashboard` (where merchants manage chatbot)

2. **Add Webhook Configuration:**
   - Webhook URL: `https://6948f4cc003d4c022adb.fra.appwrite.run`
   - Events to subscribe:
     - `app:install` - When merchant installs your app
     - `app:uninstall` - When merchant uninstalls
     - `store:authorize` - When store is authorized

3. **Add Widget Injection:**
   - In Salla app settings, specify widget script:
   - Widget Script URL: `http://localhost:8000/chatbot-widget.js`
   - Widget Position: Bottom-Left
   - Should load on: All pages

4. **Get Approved:**
   - Salla will review your app
   - Once approved, it appears in Salla app store
   - Merchants can install it from there

### Option 2: Manual Injection via Store Admin (Quick Testing)

1. **Access Demo Store Admin Panel**
   - Go to your demo store admin
   - Find "Customization" or "Custom Code" section
   - Add custom script in footer:

```html
<script src="http://localhost:8000/chatbot-widget.js" data-store-id="demo"></script>
```

2. **Test on Store Front**
   - Go to store front page
   - Scroll down
   - Chat bubble should appear

### Option 3: Use Our Webhook to Inject (Advanced)

Modify the Appwrite function to:
1. Receive webhook when app is installed
2. Get merchant's store ID
3. Inject widget into their Salla store via Salla API
4. Widget auto-loads on all store pages

---

## Next Steps

**To make the widget work on Salla demo store:**

1. **Choose Option 1 or 2 above**
2. **If Option 1:** Register app in Salla Partners (takes 2-3 days for approval)
3. **If Option 2:** Manually add script to store admin (instant testing)

---

## File Structure

```
chatbot3/
├── chatbot-widget.js           # The widget that loads on stores
├── desktop-app/                # Electron desktop manager
├── functions/salla-webhook/    # Appwrite webhook handler
├── salla-app-manifest.json     # Salla app configuration
└── salla-demo-store-test.html  # Local testing page
```

---

## Architecture

```
Salla Store Page
    ↓ (Loads widget script)
chatbot-widget.js
    ↓ (Connects to)
Appwrite Database
    ↓ (Stores conversations)
/conversations collection
    ↓ (Displayed in)
Desktop App Dashboard
```

---

## Testing Locally

**Already working:**
```bash
# Start local server
cd /chatbot-final
python -m http.server 8000

# Open test page
http://localhost:8000/salla-demo-store-test.html

# See widget working
```

---

## Production Deployment

**When ready to deploy:**

1. Host widget on CDN:
   ```
   https://cdn.chatbot.sa/widget.js
   ```

2. Update widget URL in Salla app settings

3. Deploy Appwrite function to production

4. Update redirect URIs and OAuth URLs

---

## Support

For Salla app integration help:
- [Salla Developers](https://developers.salla.sa)
- [Salla API Docs](https://docs.salla.sa)
- Salla Support: support@salla.sa

---

**Summary:** The widget works! Just needs to be registered with Salla so their system knows to load it on merchant stores. Until then, you can test it locally or manually inject the script on your demo store.
