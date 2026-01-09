import FormData from 'form-data';

export default async ({ req, res, log, error }) => {
  // CORS headers
  res.addHeader('Access-Control-Allow-Origin', '*');
  res.addHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.addHeader('Access-Control-Allow-Headers', 'Content-Type, x-stability-key');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.send('OK', 200);
  }

  // Health check
  if (req.method === 'GET' && req.path === '/') {
    return res.json({ status: 'ok', message: 'Image relay function is running' }, 200);
  }

  // Image generation endpoint
  if (req.method === 'POST' && req.path === '/api/generate-image') {
    try {
      const { prompt, negative_prompt, init_image, image_strength } = req.bodyJson;
      
      const apiKey = process.env.STABILITY_API_KEY || req.headers['x-stability-key'];
      
      if (!apiKey) {
        return res.json({ 
          error: 'Missing STABILITY_API_KEY. Set it in Appwrite Function environment variables.' 
        }, 400);
      }

      log(`Generating image: "${prompt?.slice(0, 80) || ''}..."`);

      const STABILITY_ENDPOINT = 'https://api.stability.ai/v2beta/stable-image/generate/sd3';
      
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('negative_prompt', negative_prompt || 'blurry, watermark, text, lowres');
      formData.append('aspect_ratio', '9:16');
      formData.append('output_format', 'png');
      formData.append('cfg_scale', '7');

      if (init_image) {
        const base64Data = init_image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        formData.append('image', buffer, { filename: 'init.png' });
        formData.append('strength', String(image_strength || 0.5));
        formData.append('mode', 'image-to-image');
      }

      const response = await fetch(STABILITY_ENDPOINT, {
        method: 'POST',
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${apiKey}`,
          Accept: 'image/png',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        error(`Stability API error: ${response.status}`);
        return res.json({ 
          error: `Stability API error: ${response.status}`,
          details: errorText 
        }, response.status);
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      
      log('Image generated successfully');
      
      return res.json({ 
        success: true,
        image: `data:image/png;base64,${base64}` 
      }, 200);

    } catch (err) {
      error(err.message);
      return res.json({ error: err.message || 'Internal server error' }, 500);
    }
  }

  return res.json({ error: 'Endpoint not found' }, 404);
};
