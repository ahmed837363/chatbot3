// Quick script to create test store config in Appwrite
// Run: node create-test-store.js

const https = require('https');

const ENDPOINT = 'fra.cloud.appwrite.io';
const PROJECT_ID = '694669640010920ea3f6';
const DATABASE_ID = '6946699d001194236820';
const COLLECTION_ID = 'chatbot_configs';

// Get API key from Appwrite Console → Settings → API Keys
const API_KEY = process.env.APPWRITE_API_KEY || 'standard_4f715c18eec2f846e87bfa105e62292792470d70e413884d8fb5bc7b4f6a5c20b8a333c5396b81bd83ee746fc56b658658c7665ad0215a37112ad8b55f92c20768ca154c5663d10fedfbea086196d0b272d12dd23d8d314bf28affe73c98705089679979a316d00fc04e7d2f2e10744a01ec5bdbab33f7555fb7c12cce38cd40';

const storeData = {
    configId: 1,
    merchantId: 123456789,
    botName: "مساعد المتجر",
    language: "ar",
    storeName: "متجر الاختبار",
    shippingCost: "50",
    freeShippingMin: "300",
    deliveryDays: "1-3",
    paymentMethods: "مدى، Apple Pay، تابي",
    returnDays: "7",
    supportPhone: "800123456",
    supportEmail: "support@teststore.sa",
    supportWhatsApp: "+966551234567"
};

const postData = JSON.stringify({
    documentId: 'store_123456789',
    data: storeData
});

const options = {
    hostname: ENDPOINT,
    port: 443,
    path: `/v1/databases/${DATABASE_ID}/collections/${COLLECTION_ID}/documents`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY,
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('🚀 Creating store config in Appwrite...\n');
console.log('Store Data:', JSON.stringify(storeData, null, 2));
console.log('\n');

if (!API_KEY) {
    console.log('⚠️ No API key provided!');
    console.log('\nTo create the document automatically:');
    console.log('1. Go to Appwrite Console → Settings → API Keys');
    console.log('2. Create a new key with Database permissions');
    console.log('3. Run: set APPWRITE_API_KEY=your_key_here');
    console.log('4. Run: node create-test-store.js\n');
    console.log('Or create manually in Appwrite Console → chatbot_configs → + Create row');
    console.log('\nCopy this JSON:\n');
    console.log(JSON.stringify(storeData, null, 2));
    process.exit(0);
}

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
        if (res.statusCode === 201) {
            console.log('✅ Store config created successfully!');
            console.log(JSON.parse(data));
        } else {
            console.log('❌ Error:', res.statusCode);
            console.log(data);
        }
    });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(postData);
req.end();
