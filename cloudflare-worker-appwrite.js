// Cloudflare Worker: Appwrite Proxy
// Deploy this to Cloudflare Workers
// URL: https://appwrite-proxy.YOUR_SUBDOMAIN.workers.dev

const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '694669640010920ea3f6';
const DATABASE_ID = '6946699d001194236820';

export default {
    async fetch(request, env, ctx) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Max-Age': '86400',
                }
            });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // Route: /settings/:merchantId - Get store settings
        if (path.startsWith('/settings/')) {
            const merchantId = path.split('/')[2];
            return await getStoreSettings(merchantId);
        }

        // Route: /health - Health check
        if (path === '/health') {
            return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
        }

        return jsonResponse({ error: 'Not found' }, 404);
    }
};

async function getStoreSettings(merchantId) {
    try {
        const merchantIdInt = parseInt(merchantId) || 0;
        const query = encodeURIComponent(`equal("merchantId",${merchantIdInt})`);
        const url = `${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/chatbot_configs/documents?queries[]=${query}`;

        const response = await fetch(url, {
            headers: {
                'X-Appwrite-Project': PROJECT_ID,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.documents && data.documents.length > 0) {
            const doc = data.documents[0];
            return jsonResponse({
                success: true,
                settings: {
                    storeName: doc.storeName || '',
                    shippingCost: doc.shippingCost || '25',
                    freeShippingMin: doc.freeShippingMin || '200',
                    deliveryDays: doc.deliveryDays || '2-5',
                    paymentMethods: doc.paymentMethods || '',
                    returnDays: doc.returnDays || '14',
                    supportPhone: doc.supportPhone || '',
                    supportEmail: doc.supportEmail || '',
                    supportWhatsApp: doc.supportWhatsApp || ''
                }
            });
        }

        return jsonResponse({ success: false, error: 'Store not found' }, 404);

    } catch (error) {
        return jsonResponse({ success: false, error: error.message }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
