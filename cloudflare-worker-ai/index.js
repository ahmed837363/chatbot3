/**
 * AI Chat Worker - Cloudflare Worker with Saudi Dialect AI
 * Connects to OpenAI/Groq/Claude API and responds in Saudi Arabic dialect
 */

export default {
  async fetch(request, env) {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (request.method === 'GET') {
      return new Response(JSON.stringify({ status: 'ok', service: 'ai-chat' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Only POST for chat
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();
      const { message, storeId, conversationHistory = [], systemPrompt } = body;

      if (!message) {
        return new Response(JSON.stringify({ error: 'Message is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Get AI response with Saudi dialect (use custom systemPrompt if provided)
      const aiResponse = await getAIResponse(message, storeId, conversationHistory, env, systemPrompt);

      return new Response(JSON.stringify({ 
        response: aiResponse,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('AI Chat Error:', error);
      return new Response(JSON.stringify({ 
        error: 'حصل خطأ، جرب مرة ثانية',
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

/**
 * Saudi Dialect System Prompt
 */
const SAUDI_SYSTEM_PROMPT = `أنت مساعد ذكي لمتجر إلكتروني سعودي. تتحدث باللهجة السعودية العامية بشكل طبيعي وودود.

قواعد مهمة:
- استخدم اللهجة السعودية الشائعة (مثل: "وش تبي؟"، "تمام"، "الحين"، "يعطيك العافية"، "إن شاء الله"، "ما عليك زود")
- كن ودود ومساعد ومختصر في الردود
- استخدم الإيموجي بشكل معتدل 😊
- إذا سألوك عن منتج، حاول تساعدهم
- إذا ما تعرف الجواب، قول بصراحة وحولهم للدعم
- خلي ردودك قصيرة ومفيدة (جملتين أو ثلاث)

أمثلة على أسلوبك:
- "هلا والله! وش أقدر أساعدك فيه اليوم؟ 😊"
- "تمام، الحين أشيك لك على الطلب"
- "أبشر! المنتج متوفر وسعره كويس"
- "للأسف ما قدرت ألقى المعلومة، تبي أحولك للدعم؟"
- "يعطيك العافية! فيه شي ثاني تبي تسأل عنه؟"

أنت تمثل متجر إلكتروني احترافي وتبي تساعد العملاء بأفضل طريقة.`;

/**
 * Get AI Response using OpenAI API (or Groq for faster/cheaper)
 */
async function getAIResponse(message, storeId, conversationHistory, env, customSystemPrompt = null) {
  // Try Groq first (faster and cheaper), fallback to OpenAI
  const GROQ_API_KEY = env.GROQ_API_KEY;
  const OPENAI_API_KEY = env.OPENAI_API_KEY;
  
  // Use custom system prompt if provided (includes store products), else use default
  const systemPrompt = customSystemPrompt || SAUDI_SYSTEM_PROMPT;
  
  // Build messages array
  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-10), // Keep last 10 messages for context
    { role: 'user', content: message }
  ];

  // Try Groq first (llama-3.1-70b is great for Arabic)
  if (GROQ_API_KEY) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: messages,
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (e) {
      console.error('Groq error:', e);
    }
  }

  // Fallback to OpenAI
  if (OPENAI_API_KEY) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Fast and cheap
          messages: messages,
          max_tokens: 300,
          temperature: 0.7
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (e) {
      console.error('OpenAI error:', e);
    }
  }

  // Fallback to local responses if no API key
  return getLocalResponse(message);
}

/**
 * Local fallback responses in Saudi dialect
 */
function getLocalResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // Greeting responses
  if (lowerMessage.includes('هلا') || lowerMessage.includes('السلام') || lowerMessage.includes('مرحبا')) {
    const greetings = [
      'هلا والله! وش أقدر أساعدك فيه؟ 😊',
      'أهلين وسهلين! كيف أقدر أخدمك اليوم؟',
      'مرحبا مليون! وش تبي تعرف؟'
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Price questions
  if (lowerMessage.includes('سعر') || lowerMessage.includes('كم') || lowerMessage.includes('بكم')) {
    return 'أبشر! قول لي اسم المنتج وأعطيك السعر الحين 🏷️';
  }

  // Shipping questions
  if (lowerMessage.includes('شحن') || lowerMessage.includes('توصيل') || lowerMessage.includes('يوصل')) {
    return 'الشحن عندنا سريع! عادة يوصل خلال ٢-٥ أيام حسب منطقتك 🚚';
  }

  // Return/exchange
  if (lowerMessage.includes('استرجاع') || lowerMessage.includes('استبدال') || lowerMessage.includes('إرجاع')) {
    return 'عندنا سياسة استرجاع خلال ١٤ يوم. تبي أشرح لك التفاصيل؟';
  }

  // Payment
  if (lowerMessage.includes('دفع') || lowerMessage.includes('فيزا') || lowerMessage.includes('مدى') || lowerMessage.includes('تحويل')) {
    return 'نقبل مدى وفيزا وماستركارد وأبل باي! الدفع آمن ١٠٠٪ 💳';
  }

  // Thanks
  if (lowerMessage.includes('شكر') || lowerMessage.includes('مشكور') || lowerMessage.includes('يعطيك')) {
    return 'العفو! يسعدني أخدمك. فيه شي ثاني تبي تسأل عنه؟ 😊';
  }

  // Default response
  const defaults = [
    'تمام، وش بالضبط تبي تعرف؟ أنا هنا أساعدك 😊',
    'أبشر! قول لي أكثر عشان أقدر أساعدك صح',
    'ما فهمت السؤال تمام. ممكن توضح لي شوي؟'
  ];
  return defaults[Math.floor(Math.random() * defaults.length)];
}
