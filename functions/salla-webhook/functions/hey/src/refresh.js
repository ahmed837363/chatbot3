// Scheduled refresh function - updates cached store data daily
import { Client, Databases, Query } from 'node-appwrite';

export async function refreshStoreData(databases, storeDoc, log) {
  const accessToken = storeDoc.accessToken;
  const storeId = storeDoc.$id;
  
  if (!accessToken) {
    log(`⚠️ No access token for store ${storeDoc.storeName}`);
    return false;
  }

  log(`🔄 Refreshing data for: ${storeDoc.storeName}`);

  let storeDataCache = {
    products: [],
    shippingZones: [],
    coupons: [],
    offers: [],
    lastUpdated: new Date().toISOString()
  };

  try {
    // Fetch Products
    const productsResp = await fetch('https://api.salla.dev/admin/v2/products?per_page=100&status=sale', {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    if (productsResp.ok) {
      const productsData = await productsResp.json();
      storeDataCache.products = (productsData.data || []).map(p => ({
        id: String(p.id),
        name: p.name,
        price: p.price?.amount || 0,
        currency: p.price?.currency || 'SAR',
        description: (p.description || '').replace(/<[^>]*>/g, '').substring(0, 200),
        url: p.url || '',
        image: p.images?.[0]?.url || '',
        inStock: p.quantity > 0 || p.unlimited_quantity
      }));
    }

    // Fetch Shipping Zones
    const shippingResp = await fetch('https://api.salla.dev/admin/v2/shipping/zones', {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    if (shippingResp.ok) {
      const shippingData = await shippingResp.json();
      storeDataCache.shippingZones = (shippingData.data || []).map(z => ({
        id: String(z.id),
        name: z.name,
        countries: z.countries?.map(c => c.name) || [],
        methods: (z.shipping_methods || []).map(m => ({
          name: m.name,
          cost: m.cost?.amount || 0,
          estimatedDays: m.estimated_delivery_time || ''
        }))
      }));
    }

    // Fetch Active Coupons
    const couponsResp = await fetch('https://api.salla.dev/admin/v2/coupons?status=active', {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    if (couponsResp.ok) {
      const couponsData = await couponsResp.json();
      storeDataCache.coupons = (couponsData.data || []).map(c => ({
        code: c.code,
        type: c.type,
        discount: c.amount || c.percentage || 0,
        expiresAt: c.end_date || null
      }));
    }

    // Fetch Special Offers
    const offersResp = await fetch('https://api.salla.dev/admin/v2/special-offers?status=active', {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Accept': 'application/json' }
    });
    if (offersResp.ok) {
      const offersData = await offersResp.json();
      storeDataCache.offers = (offersData.data || []).map(o => ({
        name: o.name,
        type: o.type,
        discount: o.discount || 0,
        endsAt: o.end_date || null
      }));
    }

    // Update in database
    await databases.updateDocument(
      '6946699d001194236820',
      'store_connections',
      storeId,
      {
        cachedProducts: JSON.stringify(storeDataCache.products).substring(0, 50000),
        cachedShipping: JSON.stringify(storeDataCache.shippingZones).substring(0, 10000),
        cachedCoupons: JSON.stringify(storeDataCache.coupons).substring(0, 5000),
        cachedOffers: JSON.stringify(storeDataCache.offers).substring(0, 5000),
        cacheLastUpdated: storeDataCache.lastUpdated
      }
    );

    log(`✅ Refreshed: ${storeDataCache.products.length} products, ${storeDataCache.coupons.length} coupons`);
    return true;

  } catch (error) {
    log(`❌ Refresh failed for ${storeDoc.storeName}: ${error.message}`);
    return false;
  }
}
