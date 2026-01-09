# Image Relay Backend for Appwrite

This is a Node.js backend relay for image generation that proxies requests to Stability AI. It avoids CORS issues and keeps your API keys secure.

## Setup

### Option 1: Deploy to Appwrite Functions (Recommended)

1. **Install Appwrite CLI:**
   ```bash
   npm install -g appwrite-cli
   # or
   brew install appwrite-cli  # on macOS
   ```

2. **Log in to Appwrite:**
   ```bash
   appwrite login
   ```
   - Endpoint: Your Appwrite instance URL (e.g., https://cloud.appwrite.io/v1)
   - API Key: From Appwrite Console → Settings → API Keys

3. **Deploy the function:**
   ```bash
   cd backend
   appwrite deploy function
   ```
   - Select the function: `image-relay`
   - The CLI will guide you through the deployment

4. **Set Environment Variables:**
   - Go to Appwrite Console
   - Navigate to Functions → image-relay
   - Click "Settings"
   - Under "Variables", add:
     - Name: `STABILITY_API_KEY`
     - Value: Your Stability API key from https://platform.stability.ai/account/keys

5. **Get your Function URL:**
   - In Appwrite Console, go to Functions → image-relay
   - Copy the "Domain" URL (e.g., `https://your-project.appwrite.cloud/functions/image-relay`)

6. **Use in the chatbot:**
   - Open the chatbot sidebar (Setup tab)
   - Set **Image Relay URL** to your Function URL
   - Example: `https://your-project.appwrite.cloud/functions/image-relay`

### Option 2: Run Locally (for development)

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set API key:**
   ```bash
   export STABILITY_API_KEY=sk-your-key-here
   # or on Windows:
   # set STABILITY_API_KEY=sk-your-key-here
   ```

3. **Run the server:**
   ```bash
   npm start
   ```

4. **Use in the chatbot:**
   - Set **Image Relay URL** to `http://localhost:3001`

## How It Works

The relay server:
1. Receives image generation requests from the chatbot
2. Takes the Stability API key from environment variables or request headers
3. Proxies the request to Stability AI
4. Returns the generated image as base64
5. Never exposes the API key to the browser

## Endpoints

- `GET /` - Health check
- `POST /api/generate-image` - Generate image from text or img2img

### Request body:
```json
{
  "prompt": "A beautiful landscape",
  "negative_prompt": "blurry, watermark",
  "init_image": "data:image/png;base64,...",  // optional
  "image_strength": 0.5  // optional, for img2img
}
```

### Response:
```json
{
  "success": true,
  "image": "data:image/png;base64,..."
}
```

## Troubleshooting

**Appwrite deploy fails:**
- Make sure you're logged in: `appwrite auth show`
- Check that the `appwrite.json` is in the `/backend` folder
- Verify your API key has the right permissions

**Function returns 401:**
- Check that `STABILITY_API_KEY` is set in Appwrite Function settings
- Make sure the key is valid at https://platform.stability.ai

**CORS errors in the chatbot:**
- Verify the Function URL in sidebar matches your actual Appwrite Function domain
- The Function automatically handles CORS for all origins
