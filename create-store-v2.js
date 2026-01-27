// Create test store config in Appwrite
const https = require('https');

const ENDPOINT = 'fra.cloud.appwrite.io';
const PROJECT_ID = '694669640010920ea3f6';
const DATABASE_ID = '6946699d001194236820';
const COLLECTION_ID = 'chatbot_configs';
const API_KEY = 'standard_4f715c18eec2f846e87bfa105e62292792470d70e413884d8fb5bc7b4f6a5c20b8a333c5396b81bd83ee746fc56b658658c7665ad0215a37112ad8b55f92c20768ca154c5663d10fedfbea086196d0b272d12dd23d8d314bf28affe73c98705089679979a316d00fc04e7d2f2e10744a01ec5bdbab33f7555fb7c12cce38cd40';

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

console.log('🚀 Creating store config...');
console.log('API Key:', API_KEY.substring(0, 20) + '...');
console.log('Data:', postData);

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

const req = https.request(options, (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log('Response:', data);
        if (res.statusCode === 201) {
            console.log('\n✅ SUCCESS! Store config created!');
        } else {
            console.log('\n❌ Failed to create');
        }
    });
});

req.on('error', (e) => {
    console.error('Error:', e.message);
});

req.write(postData);
req.end();
