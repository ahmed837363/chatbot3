# 🚀 Deploy Salla Webhook Handler to Appwrite

## Step 1: Create Appwrite Function

1. Go to **Appwrite Console**: https://fra.cloud.appwrite.io/console/project-694669640010920ea3f6
2. Click **"Functions"** in left menu
3. Click **"Create Function"**
4. Configure:
   - **Name**: `salla-webhook`
   - **Runtime**: `Node.js 18.0`
   - **Execute access**: `Any` (Salla needs to call it)
   - **Events**: Leave empty
   - **Schedule**: Leave empty

## Step 2: Upload Code

1. In your function, click **"Deploy"** tab
2. Click **"Manual"**
3. Upload the entire `functions/salla-webhook` folder
4. OR use Git integration to deploy from GitHub

## Step 3: Set Environment Variables

Click **"Settings"** → **"Variables"** and add:

```
APPWRITE_API_KEY = [Create one in Appwrite Console → API Keys → Create API Key]
```

The API key needs these permissions:
- ✅ `databases.read`
- ✅ `databases.write`

## Step 4: Get Function URL

1. Go to **"Domains"** tab in your function
2. Copy the function URL, something like:
   ```
   https://fra.cloud.appwrite.io/v1/functions/[FUNCTION_ID]/executions
   ```

## Step 5: Update Salla Webhook URL

1. Go to **Salla Partners** → Your app
2. In **"Webhooks/Notifications"** section
3. Update webhook URL to your function URL:
   ```
   https://fra.cloud.appwrite.io/v1/functions/[FUNCTION_ID]/executions
   ```

## ✅ Done!

Now when a merchant installs your app:
1. Salla sends POST request to Appwrite Function
2. Function receives webhook ✅
3. Function saves to database ✅
4. Function auto-installs chatbot ✅
5. All automatic! 🎉

---

## Test It:

**Option A - Manual Test:**
```bash
curl -X POST https://fra.cloud.appwrite.io/v1/functions/[FUNCTION_ID]/executions \
  -H "Content-Type: application/json" \
  -d '{
    "event": "app.store.authorize",
    "merchant": {"id": 12345, "name": "Test Store", "domain": "test.salla.sa"},
    "data": {"access_token": "test_token", "refresh_token": "test_refresh", "expires_in": 31536000}
  }'
```

**Option B - Real Test:**
Install your app on your father's Salla store!
