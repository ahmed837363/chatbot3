# AI Chat Worker - Saudi Dialect Chatbot

This Cloudflare Worker powers the AI chatbot with Saudi Arabic dialect responses.

## Features
- 🇸🇦 Saudi Arabic dialect (اللهجة السعودية)
- ⚡ Fast responses via Groq (llama-3.1-70b) or OpenAI
- 💬 Conversation history for context
- 🔄 Automatic fallback to local responses

## Deployment

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Login to Cloudflare
```bash
wrangler login
```

### 3. Deploy the Worker
```bash
cd cloudflare-worker-ai
wrangler deploy
```

### 4. Add API Keys (Secrets)

**Option A: Groq (Recommended - Free & Fast)**
```bash
wrangler secret put GROQ_API_KEY
# Paste your Groq API key from https://console.groq.com
```

**Option B: OpenAI**
```bash
wrangler secret put OPENAI_API_KEY
# Paste your OpenAI API key from https://platform.openai.com
```

## Get API Keys

### Groq (FREE - Recommended)
1. Go to https://console.groq.com
2. Sign up (free)
3. Create API key
4. Use with `wrangler secret put GROQ_API_KEY`

### OpenAI
1. Go to https://platform.openai.com
2. Create API key
3. Add billing (pay-as-you-go)
4. Use with `wrangler secret put OPENAI_API_KEY`

## Update Widget

After deploying, get your worker URL (e.g., `https://ai-chat-worker.YOUR_SUBDOMAIN.workers.dev`)

Update in `chatbot-widget.js`:
```javascript
aiWorkerUrl: 'https://ai-chat-worker.YOUR_SUBDOMAIN.workers.dev',
```

Or pass via script tag:
```html
<script 
  src="chatbot-widget.js" 
  data-store-id="123" 
  data-ai-url="https://ai-chat-worker.YOUR_SUBDOMAIN.workers.dev">
</script>
```

## Test Locally
```bash
wrangler dev
```

Then test with:
```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{"message": "هلا", "storeId": "test"}'
```

## Saudi Dialect Examples

The AI responds naturally in Saudi dialect:

| Customer Says | AI Responds |
|---------------|-------------|
| هلا | هلا والله! وش أقدر أساعدك فيه؟ 😊 |
| كم سعر المنتج؟ | أبشر! قول لي اسم المنتج وأعطيك السعر الحين 🏷️ |
| متى يوصل الشحن؟ | الشحن عندنا سريع! عادة يوصل خلال ٢-٥ أيام 🚚 |
| شكراً | العفو! يسعدني أخدمك. فيه شي ثاني؟ 😊 |

## Cost Estimate

| Service | Cost |
|---------|------|
| Groq | FREE (generous limits) |
| OpenAI GPT-4o-mini | ~$0.0001 per message |
| Cloudflare Worker | FREE (100K requests/day) |
