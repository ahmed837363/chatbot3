# Appwrite Store Settings Setup Guide

This guide explains how to set up Appwrite to store and manage settings for all your Salla stores.

## Benefits of Using Appwrite

✅ **Centralized Management** - All store settings in one place  
✅ **No Code Changes** - Update settings without touching the code  
✅ **24-Hour Caching** - Fast loading, automatic refresh  
✅ **Multiple Stores** - Each store has its own configuration  
✅ **Daily Updates** - Can sync with Salla API automatically  

---

## 1. Create the `store_settings` Collection

Go to your Appwrite Console → Database → Create Collection:

**Collection Name:** `store_settings`  
**Collection ID:** `store_settings` (custom ID)

### Attributes to Create:

| Attribute Name   | Type    | Size | Required | Default Value |
|-----------------|---------|------|----------|---------------|
| `merchantId`    | Integer | -    | ✅ Yes   | -             |
| `storeName`     | String  | 255  | ❌ No    | متجر           |
| `shippingCost`  | String  | 50   | ❌ No    | 25            |
| `freeShippingMin`| String | 50   | ❌ No    | 200           |
| `deliveryDays`  | String  | 50   | ❌ No    | 2-5           |
| `paymentMethods`| String  | 500  | ❌ No    | مدى، فيزا، ماستركارد، Apple Pay، تابي |
| `returnDays`    | String  | 50   | ❌ No    | 14            |
| `supportPhone`  | String  | 50   | ❌ No    | -             |
| `supportEmail`  | String  | 255  | ❌ No    | -             |
| `supportWhatsApp`| String | 50   | ❌ No    | -             |

### Index (for fast lookups):

| Index Name    | Type   | Attribute   |
|---------------|--------|-------------|
| `merchantId_idx` | Key | `merchantId` |

---

## 2. Create Document for Each Store

For each store, create a document with their settings:

### Example - Fashion Store:
```json
{
  "merchantId": 123456789,
  "storeName": "Maya Style",
  "shippingCost": "25",
  "freeShippingMin": "200",
  "deliveryDays": "2-5",
  "paymentMethods": "مدى، فيزا، ماستركارد، Apple Pay، تابي",
  "returnDays": "14",
  "supportPhone": "920012345",
  "supportEmail": "support@mayastyle.com",
  "supportWhatsApp": "+966512345678"
}
```

### Example - Electronics Store:
```json
{
  "merchantId": 987654321,
  "storeName": "Tech Store",
  "shippingCost": "0",
  "freeShippingMin": "0",
  "deliveryDays": "1-3",
  "paymentMethods": "مدى، فيزا، ماستركارد، Apple Pay، تمارا، تابي",
  "returnDays": "7",
  "supportPhone": "800TECHNO",
  "supportEmail": "help@techstore.sa",
  "supportWhatsApp": "+966551234567"
}
```

---

## 3. Set Permissions

For the collection to be readable by the chatbot widget:

1. Go to Collection Settings → Permissions
2. Add: **Any** (read only) - `role:any` with `read` permission

This allows the chatbot to fetch settings without authentication.

---

## 4. How It Works

```
[Chatbot Loads] 
     ↓
[Check localStorage cache]
     ↓
[Cache < 24 hours?] → YES → Use cached settings
     ↓ NO
[Fetch from Appwrite]
     ↓
[Found?] → YES → Update storeConfig + cache
     ↓ NO
[Use HTML attributes or defaults]
```

---

## 5. Priority Order

The chatbot uses settings in this order:

1. **Appwrite Database** (if found)
2. **HTML Attributes** (fallback)
3. **Default Values** (last resort)

This means you can:
- Set global defaults in Appwrite
- Override specific stores via HTML attributes if needed

---

## 6. Console Commands

In the browser console, you can:

```javascript
// View current settings
chatbotSettings.get()

// Force refresh from Appwrite (bypass cache)
chatbotSettings.refresh()

// Clear cache
chatbotSettings.clearCache()
```

---

## 7. Daily Sync with Salla (Optional)

To automatically update store settings from Salla API:

### Option A: Appwrite Function (Scheduled)

Create an Appwrite Function that runs daily:

```javascript
// Runs every 24 hours
// Fetches store info from Salla API
// Updates the store_settings collection

const sdk = require('node-appwrite');

module.exports = async function(req, res) {
    const client = new sdk.Client();
    client
        .setEndpoint('https://fra.cloud.appwrite.io/v1')
        .setProject('YOUR_PROJECT_ID')
        .setKey('YOUR_API_KEY');
    
    const databases = new sdk.Databases(client);
    
    // Fetch stores from store_connections collection
    const stores = await databases.listDocuments(
        'YOUR_DATABASE_ID',
        'store_connections'
    );
    
    for (const store of stores.documents) {
        // Fetch latest info from Salla API
        const sallaResponse = await fetch(
            `https://api.salla.dev/admin/v2/store`,
            {
                headers: {
                    'Authorization': `Bearer ${store.accessToken}`
                }
            }
        );
        
        const sallaData = await sallaResponse.json();
        
        // Update store_settings
        await databases.updateDocument(
            'YOUR_DATABASE_ID',
            'store_settings',
            store.$id,
            {
                storeName: sallaData.data.name,
                // ... other fields
            }
        );
    }
    
    return res.json({ success: true });
};
```

### Option B: External Cron Job

Use a service like:
- **GitHub Actions** (free, runs on schedule)
- **Vercel Cron** 
- **Railway Cron**
- **Your own server with crontab**

---

## 8. Testing

1. Add a store document in Appwrite
2. Open the store website
3. Open browser console
4. Check for: `✅ Loaded store settings from Appwrite`
5. Run `chatbotSettings.get()` to verify

---

## Support

Need help? Check:
- Appwrite Console → Logs for errors
- Browser Console for `⚠️` warnings
- Verify `merchantId` matches `data-store-id`
