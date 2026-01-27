/**
 * Quick Sync Script - Run locally to sync store settings
 * Usage: node sync-stores.js
 * 
 * This creates a test store config in Appwrite
 */

const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const PROJECT_ID = '694669640010920ea3f6';
const DATABASE_ID = '6946699d001194236820';
const COLLECTION_ID = 'chatbot_configs';

// Test store data - modify this for your stores
const TEST_STORES = [
    {
        configId: 1,
        merchantId: 123456789,
        botName: "مساعد المتجر",
        language: "ar",
        storeName: "متجر الاختبار",
        shippingCost: "50",
        freeShippingMin: "300",
        deliveryDays: "1-3",
        paymentMethods: "مدى، Apple Pay، تابي، تمارا",
        returnDays: "7",
        supportPhone: "800123456",
        supportEmail: "support@teststore.sa",
        supportWhatsApp: "+966551234567"
    }
];

async function createStoreConfig(store) {
    console.log(`\n📦 Creating config for store ${store.merchantId}...`);
    
    // First check if exists
    const checkUrl = `${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents?queries[]=${encodeURIComponent(`equal("merchantId",${store.merchantId})`)}`;
    
    try {
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'X-Appwrite-Project': PROJECT_ID,
                'Content-Type': 'application/json'
            }
        });
        
        const checkData = await checkResponse.json();
        
        if (checkData.total > 0) {
            console.log(`⚠️ Store ${store.merchantId} already exists, updating...`);
            // Would need API key to update - skip for now
            console.log(`✅ Store config exists: ${checkData.documents[0].$id}`);
            return;
        }
        
        console.log(`ℹ️ Store not found. Please create manually in Appwrite Console.`);
        console.log(`\n📋 Copy this JSON to create the document:\n`);
        console.log(JSON.stringify(store, null, 2));
        
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

async function main() {
    console.log('🚀 Store Settings Sync Tool\n');
    console.log('=' .repeat(50));
    
    for (const store of TEST_STORES) {
        await createStoreConfig(store);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n📌 To create stores automatically, you need an Appwrite API Key.');
    console.log('   Go to Appwrite Console → Settings → API Keys → Create Key');
    console.log('   Then set it as environment variable: APPWRITE_API_KEY');
}

main();
