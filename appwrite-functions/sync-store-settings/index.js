/**
 * Appwrite Function: Sync Salla Store Settings
 * 
 * Triggers:
 * 1. When store connects (webhook from Salla)
 * 2. Daily schedule (cron: 0 3 * * *)
 * 
 * What it does:
 * - Fetches store info from Salla API
 * - Updates chatbot_configs in Appwrite
 */

const sdk = require('node-appwrite');

// Appwrite configuration
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '694669640010920ea3f6';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || 'standard_4f715c18eec2f846e87bfa105e62292792470d70e413884d8fb5bc7b4f6a5c20b8a333c5396b81bd83ee746fc56b658658c7665ad0215a37112ad8b55f92c20768ca154c5663d10fedfbea086196d0b272d12dd23d8d314bf28affe73c98705089679979a316d00fc04e7d2f2e10744a01ec5bdbab33f7555fb7c12cce38cd40';
const DATABASE_ID = '6946699d001194236820';
const STORE_CONNECTIONS_COLLECTION = 'store_connections';
const CHATBOT_CONFIGS_COLLECTION = 'chatbot_configs';

module.exports = async function(context) {
    const { req, res, log, error } = context;
    
    // Initialize Appwrite client
    const client = new sdk.Client();
    client
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(process.env.APPWRITE_API_KEY); // Set in Appwrite Console
    
    const databases = new sdk.Databases(client);
    
    try {
        // Check if this is a webhook call with specific store data
        let storeToSync = null;
        if (req.body && req.body.merchantId) {
            storeToSync = req.body;
            log(`Syncing single store: ${storeToSync.merchantId}`);
        }
        
        if (storeToSync) {
            // Sync single store (from webhook)
            await syncSingleStore(databases, storeToSync, log, error);
        } else {
            // Sync all stores (scheduled run)
            await syncAllStores(databases, log, error);
        }
        
        return res.json({
            success: true,
            message: 'Sync completed',
            timestamp: new Date().toISOString()
        });
        
    } catch (err) {
        error(`Sync failed: ${err.message}`);
        return res.json({
            success: false,
            error: err.message
        }, 500);
    }
};

/**
 * Sync all stores from store_connections
 */
async function syncAllStores(databases, log, error) {
    log('Starting full sync of all stores...');
    
    // Get all store connections
    const stores = await databases.listDocuments(
        DATABASE_ID,
        STORE_CONNECTIONS_COLLECTION,
        [sdk.Query.limit(100)]
    );
    
    log(`Found ${stores.total} stores to sync`);
    
    let synced = 0;
    let failed = 0;
    
    for (const store of stores.documents) {
        try {
            // Get access token from notes field (where we stored it)
            let accessToken = null;
            if (store.notes) {
                try {
                    const notesData = JSON.parse(store.notes);
                    accessToken = notesData.token || notesData.accessToken;
                } catch (e) {
                    // notes might be plain text
                }
            }
            
            if (!accessToken) {
                log(`⚠️ No access token for store ${store.merchantId}, skipping`);
                continue;
            }
            
            // Fetch store info from Salla API
            const storeInfo = await fetchSallaStoreInfo(accessToken, log);
            
            if (storeInfo) {
                await updateChatbotConfig(databases, store.merchantId, storeInfo, log);
                synced++;
            }
            
        } catch (err) {
            error(`Failed to sync store ${store.merchantId}: ${err.message}`);
            failed++;
        }
    }
    
    log(`✅ Sync complete: ${synced} success, ${failed} failed`);
}

/**
 * Sync a single store (from webhook)
 */
async function syncSingleStore(databases, storeData, log, error) {
    const { merchantId, accessToken } = storeData;
    
    if (!accessToken) {
        throw new Error('No access token provided');
    }
    
    log(`Syncing store ${merchantId}...`);
    
    // Fetch store info from Salla API
    const storeInfo = await fetchSallaStoreInfo(accessToken, log);
    
    if (storeInfo) {
        await updateChatbotConfig(databases, merchantId, storeInfo, log);
        log(`✅ Store ${merchantId} synced successfully`);
    }
}

/**
 * Fetch store information from Salla API
 */
async function fetchSallaStoreInfo(accessToken, log) {
    try {
        // Fetch store details
        const storeResponse = await fetch('https://api.salla.dev/admin/v2/store', {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        
        if (!storeResponse.ok) {
            log(`⚠️ Salla API error: ${storeResponse.status}`);
            return null;
        }
        
        const storeData = await storeResponse.json();
        const store = storeData.data;
        
        log(`📦 Got store info: ${store.name}`);
        
        // Fetch shipping settings
        let shippingInfo = { cost: '25', freeMin: '200', days: '2-5' };
        try {
            const shippingResponse = await fetch('https://api.salla.dev/admin/v2/shipping/companies', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
            if (shippingResponse.ok) {
                const shippingData = await shippingResponse.json();
                // Extract shipping info if available
                if (shippingData.data && shippingData.data.length > 0) {
                    const firstShipping = shippingData.data[0];
                    shippingInfo.cost = firstShipping.cost?.toString() || '25';
                }
            }
        } catch (e) {
            log(`⚠️ Could not fetch shipping: ${e.message}`);
        }
        
        return {
            storeName: store.name || 'متجر',
            shippingCost: shippingInfo.cost,
            freeShippingMin: shippingInfo.freeMin,
            deliveryDays: shippingInfo.days,
            paymentMethods: 'مدى، فيزا، ماستركارد، Apple Pay، تابي',
            returnDays: '14',
            supportPhone: store.phone || '',
            supportEmail: store.email || '',
            supportWhatsApp: store.whatsapp || store.phone || ''
        };
        
    } catch (err) {
        log(`❌ Error fetching from Salla: ${err.message}`);
        return null;
    }
}

/**
 * Update or create chatbot config in Appwrite
 */
async function updateChatbotConfig(databases, merchantId, storeInfo, log) {
    const merchantIdInt = parseInt(merchantId) || 0;
    
    // Check if config already exists
    const existing = await databases.listDocuments(
        DATABASE_ID,
        CHATBOT_CONFIGS_COLLECTION,
        [sdk.Query.equal('merchantId', merchantIdInt)]
    );
    
    const configData = {
        merchantId: merchantIdInt,
        configId: merchantIdInt,
        botName: 'مساعد المتجر',
        language: 'ar',
        ...storeInfo
    };
    
    if (existing.total > 0) {
        // Update existing
        const docId = existing.documents[0].$id;
        await databases.updateDocument(
            DATABASE_ID,
            CHATBOT_CONFIGS_COLLECTION,
            docId,
            configData
        );
        log(`📝 Updated config for store ${merchantId}`);
    } else {
        // Create new
        await databases.createDocument(
            DATABASE_ID,
            CHATBOT_CONFIGS_COLLECTION,
            sdk.ID.unique(),
            configData
        );
        log(`✅ Created config for store ${merchantId}`);
    }
}
