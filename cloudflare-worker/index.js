// Cloudflare Worker: Salla Webhook Handler + AI Proxy
// Routes webhooks to Appwrite and proxies AI requests to local LM Studio

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Add CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Appwrite-Project',
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // ============================================
    // ROUTE: /salla/webhook - Forward to Appwrite
    // ============================================
    if (url.pathname === '/salla/webhook' || url.pathname === '/salla-webhook') {
      const APPWRITE_FUNCTION_URL = env.APPWRITE_FUNCTION_URL;
      
      if (!APPWRITE_FUNCTION_URL) {
        return new Response('Missing APPWRITE_FUNCTION_URL', { status: 500 });
      }
      
      // Forward webhook to Appwrite function
      const headers = new Headers(request.headers);
      headers.delete('host');
      
      const forwarded = new Request(APPWRITE_FUNCTION_URL, {
        method: request.method,
        headers,
        body: request.body,
      });
      
      const response = await fetch(forwarded);
      return new Response(response.body, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), ...corsHeaders },
      });
    }
    
    // ============================================
    // ROUTE: /v1/* - Proxy to local AI (LM Studio)
    // ============================================
    if (url.pathname.startsWith('/v1/')) {
      const AI_URL = env.AI_LOCAL_URL || 'http://192.168.1.4:1234';
      
      const aiRequest = new Request(`${AI_URL}${url.pathname}`, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: request.method === 'POST' ? request.body : undefined,
      });
      
      try {
        const aiResponse = await fetch(aiRequest);
        return new Response(aiResponse.body, {
          status: aiResponse.status,
          headers: { ...Object.fromEntries(aiResponse.headers), ...corsHeaders },
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: 'AI service unavailable', details: e.message }), {
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    }
    
    // ============================================
    // ROUTE: / - Status page
    // ============================================
    if (url.pathname === '/' || request.method === 'GET') {
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>AI Smart Assistant - علام</title>
          <style>
            body { font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; min-height: 100vh; margin: 0; }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { font-size: 2.5em; margin-bottom: 10px; }
            .status { background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin: 20px 0; }
            .endpoint { background: rgba(0,0,0,0.2); padding: 10px; border-radius: 5px; margin: 10px 0; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🤖 AI Smart Assistant</h1>
            <h2>علام</h2>
            <div class="status">
              <p>✅ Cloudflare Worker is running</p>
              <div class="endpoint">/salla/webhook → Appwrite Function</div>
              <div class="endpoint">/v1/* → Local AI (ALLaM)</div>
            </div>
            <p style="opacity:0.7;">Powered by Cloudflare Workers + Appwrite + ALLaM AI</p>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
      });
    }
    
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
