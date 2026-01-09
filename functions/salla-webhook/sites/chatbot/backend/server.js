import express from 'express';
import cors from 'cors';
import FormData from 'form-data';

const app = express();
const PORT = process.env.PORT || 3001;

// Request tracking for memory management
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 10;
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds

// Middleware to track requests and prevent overload
const requestTracker = (req, res, next) => {
  if (activeRequests >= MAX_CONCURRENT_REQUESTS) {
    console.warn(`Request rejected: too many concurrent requests (${activeRequests})`);
    return res.status(503).json({ error: 'Server busy, please try again' });
  }
  activeRequests++;
  
  // Set a timeout for the request
  req.setTimeout(REQUEST_TIMEOUT_MS, () => {
    console.warn('Request timeout');
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  
  res.on('finish', () => {
    activeRequests--;
  });
  res.on('close', () => {
    activeRequests--;
  });
  next();
};

app.use(cors({
  origin: [
    'http://localhost:5501',
    'http://localhost:5173',
    'http://127.0.0.1:5501',
    'http://127.0.0.1:5173',
    'https://chatbot-github-student-organization.appwrite.network',
  ],
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-stability-key', 'x-brave-key'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(requestTracker);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Image relay backend is running',
    activeRequests,
    maxRequests: MAX_CONCURRENT_REQUESTS
  });
});

// Health endpoint for monitoring
app.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
    },
    activeRequests
  });
});

const BRAVE_SEARCH_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search';

const STABILITY_ENDPOINT = 'https://api.stability.ai/v2beta/stable-image/generate/sd3';

// AbortController for request cancellation
const createTimeoutController = (timeoutMs) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, clearTimeout: () => clearTimeout(timeout) };
};

app.get('/api/brave-search', async (req, res) => {
  const { controller, clearTimeout: clearTO } = createTimeoutController(12000);
  try {
    const rawQ = typeof req.query.q === 'string' ? req.query.q : '';
    const q = rawQ.trim();
    const countRaw = typeof req.query.count === 'string' ? req.query.count : '';
    const count = Math.max(1, Math.min(8, Number(countRaw || '5') || 5));

    const apiKey = process.env.BRAVE_SEARCH_API_KEY || req.headers['x-brave-key'];
    if (!apiKey) {
      clearTO();
      return res.status(400).json({ error: 'Missing BRAVE_SEARCH_API_KEY' });
    }
    if (!q) {
      clearTO();
      return res.status(400).json({ error: 'Missing query' });
    }

    const targetUrl = `${BRAVE_SEARCH_ENDPOINT}?q=${encodeURIComponent(q)}&count=${count}&spellcheck=1`;
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Subscription-Token': String(apiKey),
      },
      signal: controller.signal,
    });

    clearTO();

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error(`[${new Date().toISOString()}] Brave API error:`, response.status, errorText.slice(0, 200));
      return res.status(response.status).json({ error: `Brave API error: ${response.status}` });
    }

    const data = await response.json();
    const webResults = data?.web?.results;
    const results = Array.isArray(webResults)
      ? webResults
          .map((r) => ({
            title: typeof r?.title === 'string' ? r.title : '',
            url: typeof r?.url === 'string' ? r.url : '',
            description: typeof r?.description === 'string' ? r.description : '',
          }))
          .filter((r) => r.title && r.url)
      : [];

    res.json({
      query: q,
      fetchedAt: new Date().toISOString(),
      results: results.slice(0, count),
    });
  } catch (error) {
    clearTO();
    if (error.name === 'AbortError') {
      console.error(`[${new Date().toISOString()}] Brave request aborted (timeout)`);
      return res.status(408).json({ error: 'Request timeout' });
    }
    console.error(`[${new Date().toISOString()}] Brave relay error:`, error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/generate-image', async (req, res) => {
  const { controller, clearTimeout: clearTO } = createTimeoutController(55000);
  
  try {
    const { prompt, negative_prompt, init_image, image_strength } = req.body;
    const apiKey = process.env.STABILITY_API_KEY || req.headers['x-stability-key'];
    
    if (!apiKey) {
      clearTO();
      return res.status(400).json({ error: 'Missing STABILITY_API_KEY' });
    }
    
    if (!prompt || typeof prompt !== 'string') {
      clearTO();
      return res.status(400).json({ error: 'Missing or invalid prompt' });
    }

    console.log(`[${new Date().toISOString()}] Generating image: "${prompt.slice(0, 80)}..."`);

    const formData = new FormData();
    formData.append('prompt', prompt.slice(0, 10000)); // Limit prompt length
    formData.append('negative_prompt', (negative_prompt || 'blurry, watermark, text, lowres').slice(0, 1000));
    formData.append('aspect_ratio', '9:16');
    formData.append('output_format', 'png');
    formData.append('cfg_scale', '7');

    if (init_image && typeof init_image === 'string') {
      try {
        const base64Data = init_image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        // Limit image size to 10MB
        if (buffer.length > 10 * 1024 * 1024) {
          throw new Error('Image too large');
        }
        formData.append('image', buffer, { filename: 'init.png' });
        formData.append('strength', String(image_strength || 0.5));
        formData.append('mode', 'image-to-image');
      } catch (imgError) {
        console.warn('Failed to process init_image:', imgError.message);
      }
    }

    const response = await fetch(STABILITY_ENDPOINT, {
      method: 'POST',
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${apiKey}`,
        Accept: 'image/png',
      },
      body: formData,
      signal: controller.signal,
    });

    clearTO();

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${new Date().toISOString()}] Stability API error:`, response.status, errorText.slice(0, 200));
      return res.status(response.status).json({ error: `Stability API error: ${response.status}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    
    console.log(`[${new Date().toISOString()}] Image generated successfully`);
    res.json({ success: true, image: `data:image/png;base64,${base64}` });
  } catch (error) {
    clearTO();
    if (error.name === 'AbortError') {
      console.error(`[${new Date().toISOString()}] Request aborted (timeout)`);
      return res.status(408).json({ error: 'Request timeout' });
    }
    console.error(`[${new Date().toISOString()}] Error:`, error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/local-sd', async (req, res) => {
  const { controller, clearTimeout: clearTO } = createTimeoutController(120000); // 2 min for local SD
  
  try {
    const localSdUrl = process.env.LOCAL_SD_URL || 'http://127.0.0.1:7861';
    const { endpoint, payload } = req.body;
    
    if (!endpoint || typeof endpoint !== 'string') {
      clearTO();
      return res.status(400).json({ error: 'Missing endpoint' });
    }
    
    const targetUrl = `${localSdUrl}${endpoint}`;
    console.log(`[${new Date().toISOString()}] Proxying to Local SD: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTO();

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    res.json(data);
  } catch (error) {
    clearTO();
    if (error.name === 'AbortError') {
      console.error(`[${new Date().toISOString()}] Local SD request aborted (timeout)`);
      return res.status(408).json({ error: 'Request timeout' });
    }
    console.error(`[${new Date().toISOString()}] Local SD proxy error:`, error.message);
    res.status(500).json({ error: error.message || 'Failed to connect to Local SD' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`\n✅ Backend running on http://localhost:${PORT}\n`);
  console.log(`   Max concurrent requests: ${MAX_CONCURRENT_REQUESTS}`);
  console.log(`   Request timeout: ${REQUEST_TIMEOUT_MS / 1000}s\n`);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcing shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`[${new Date().toISOString()}] Uncaught Exception:`, err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled Rejection at:`, promise, 'reason:', reason);
});
