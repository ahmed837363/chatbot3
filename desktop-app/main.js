const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');
const http = require('http');
const { URL } = require('url');

// Initialize persistent storage
const store = new Store({
  name: 'chatbot-config',
  defaults: {
    appwrite: {
      endpoint: 'https://fra.cloud.appwrite.io/v1',
      projectId: '694669640010920ea3f6',
      databaseId: '6946699d001194236820'
    },
    salla: {
      clientId: 'a528b4f5-ed26-4a09-8aba-036938afa894',
      appId: '1628541854'
    },
    webhookUrl: 'https://6948f4cc003d4c022adb.fra.appwrite.run',
    theme: 'light',
    language: 'ar'
  }
});

let mainWindow;
let tray = null;
let oauthServer = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Chatbot Manager - مدير الشات بوت',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#667eea'
  });

  mainWindow.loadFile('renderer/index.html');

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  // Create tray icon
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  
  try {
    const icon = nativeImage.createFromPath(iconPath);
    tray = new Tray(icon.resize({ width: 16, height: 16 }));
  } catch (e) {
    // Fallback if icon not found
    tray = new Tray(nativeImage.createEmpty());
  }

  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Open Chatbot Manager', 
      click: () => mainWindow.show() 
    },
    { type: 'separator' },
    { 
      label: 'Connected Stores', 
      enabled: false 
    },
    { type: 'separator' },
    { 
      label: 'Settings', 
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('navigate', 'settings');
      }
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Chatbot Manager');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// Salla OAuth Configuration
const SALLA_CONFIG = {
  clientId: 'a528b4f5-ed26-4a09-8aba-036938afa894',
  clientSecret: '148151133bbcfab7589a35da9e69158ff4a18cbdc0212627165b22226bbc6614',
  tokenUrl: 'https://accounts.salla.sa/oauth2/token',
  storeInfoUrl: 'https://api.salla.dev/admin/v2/store/info',
  redirectUri: 'http://localhost:9000/oauth/salla/callback'
};

// Exchange Salla auth code for access token
async function exchangeSallaToken(code) {
  const response = await fetch(SALLA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      client_id: SALLA_CONFIG.clientId,
      client_secret: SALLA_CONFIG.clientSecret,
      code: code,
      redirect_uri: SALLA_CONFIG.redirectUri
    })
  });
  return response.json();
}

// Get Salla store info
async function getSallaStoreInfo(accessToken) {
  const response = await fetch(SALLA_CONFIG.storeInfoUrl, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  return response.json();
}

// Start OAuth callback server
function startOAuthServer() {
  return new Promise((resolve, reject) => {
    oauthServer = http.createServer(async (req, res) => {
      const urlObj = new URL(req.url, 'http://localhost:9000');
      const pathname = urlObj.pathname;
      const code = urlObj.searchParams.get('code');
      const shop = urlObj.searchParams.get('shop');
      const error = urlObj.searchParams.get('error');

      // Handle Shopify OAuth callback
      if (pathname === '/oauth/shopify/callback') {
        if (code && shop) {
          // Success
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
                .success { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 10px; }
                h1 { margin: 0; font-size: 32px; }
              </style>
            </head>
            <body>
              <div class="success">
                <h1>✅ Connected Successfully!</h1>
                <p>Your chatbot is being installed...</p>
                <p>You can close this window</p>
              </div>
            </body>
            </html>
          `);
          mainWindow.webContents.send('oauth-callback', { 
            success: true, 
            platform: 'shopify',
            code, 
            shop 
          });
          resolve({ code, shop });
        } else if (error) {
          // Error
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial; text-align: center; padding: 50px; background: #dc3545; color: white; }
                .error { background: rgba(0,0,0,0.2); padding: 40px; border-radius: 10px; }
                h1 { margin: 0; font-size: 32px; }
              </style>
            </head>
            <body>
              <div class="error">
                <h1>❌ Connection Failed</h1>
                <p>${error}</p>
                <p>Please try again</p>
              </div>
            </body>
            </html>
          `);
          mainWindow.webContents.send('oauth-callback', { 
            success: false, 
            platform: 'shopify',
            error 
          });
          reject(error);
        }
        return;
      }

      // Handle Salla OAuth callback
      if (pathname === '/oauth/salla/callback') {
        const sallaCode = urlObj.searchParams.get('code');
        const sallaError = urlObj.searchParams.get('error');
        const sallaErrorDesc = urlObj.searchParams.get('error_description');

        if (sallaCode) {
          try {
            // Exchange code for tokens
            console.log('🔐 Exchanging Salla auth code for token...');
            const tokenData = await exchangeSallaToken(sallaCode);
            
            if (tokenData.error) {
              throw new Error(tokenData.error_description || tokenData.error);
            }

            console.log('✅ Token received!');
            
            // Get store info
            const storeInfo = await getSallaStoreInfo(tokenData.access_token);
            console.log('📦 Store info:', storeInfo.data?.name);

            const storeData = {
              id: storeInfo.data?.id,
              name: storeInfo.data?.name || 'Salla Store',
              domain: storeInfo.data?.domain || '',
              email: storeInfo.data?.email || '',
              platform: 'salla',
              accessToken: tokenData.access_token,
              refreshToken: tokenData.refresh_token,
              expiresAt: new Date(Date.now() + (tokenData.expires_in || 3600) * 1000).toISOString(),
              connectedAt: new Date().toISOString()
            };

            // Save store to local storage
            const stores = store.get('connectedStores', []);
            // Remove if already exists
            const filtered = stores.filter(s => s.id !== storeData.id);
            filtered.push(storeData);
            store.set('connectedStores', filtered);

            // Success response
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html dir="rtl">
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial; text-align: center; padding: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; min-height: 100vh; margin: 0; }
                  .success { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; max-width: 400px; margin: 0 auto; }
                  h1 { margin: 0 0 10px 0; font-size: 48px; }
                  h2 { margin: 0; font-size: 24px; }
                  .store-name { background: rgba(255,255,255,0.2); padding: 15px 30px; border-radius: 10px; display: inline-block; margin: 20px 0; font-size: 20px; }
                  p { font-size: 16px; opacity: 0.9; }
                </style>
              </head>
              <body>
                <div class="success">
                  <h1>✅</h1>
                  <h2>تم ربط المتجر بنجاح!</h2>
                  <div class="store-name">🏪 ${storeData.name}</div>
                  <p>تم تثبيت الشات بوت على متجرك</p>
                  <p>يمكنك إغلاق هذه النافذة والعودة للتطبيق</p>
                </div>
                <script>setTimeout(() => window.close(), 3000);</script>
              </body>
              </html>
            `);

            mainWindow.webContents.send('oauth-callback', { 
              success: true, 
              platform: 'salla',
              store: storeData
            });
            
            mainWindow.show();
            resolve(storeData);
            
          } catch (err) {
            console.error('❌ Salla OAuth error:', err.message);
            res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
              <html dir="rtl">
              <head><meta charset="utf-8"><title>خطأ</title></head>
              <body style="font-family:Arial;text-align:center;padding:50px;background:#dc3545;color:white;">
                <h1>❌ فشل الربط</h1>
                <p>${err.message}</p>
                <p>يرجى المحاولة مرة أخرى</p>
              </body>
              </html>
            `);
            mainWindow.webContents.send('oauth-callback', { 
              success: false, 
              platform: 'salla',
              error: err.message 
            });
          }
        } else if (sallaError) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`
            <html dir="rtl">
            <head><meta charset="utf-8"><title>خطأ</title></head>
            <body style="font-family:Arial;text-align:center;padding:50px;background:#dc3545;color:white;">
              <h1>❌ فشل الربط</h1>
              <p>${sallaErrorDesc || sallaError}</p>
              <p>يرجى المحاولة مرة أخرى</p>
            </body>
            </html>
          `);
          mainWindow.webContents.send('oauth-callback', { 
            success: false, 
            platform: 'salla',
            error: sallaErrorDesc || sallaError
          });
        }
        return;
      }

      // Handle other generic OAuth callbacks (legacy)
      const sallCode = urlObj.searchParams.get('code');
      const sallaError = urlObj.searchParams.get('error');

      if (sallCode) {
        // Success
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html dir="rtl">
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; background: #667eea; color: white; }
              .success { background: rgba(255,255,255,0.1); padding: 40px; border-radius: 10px; }
              h1 { margin: 0; font-size: 32px; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✅ تم الاتصال بنجاح!</h1>
              <p>يمكنك غلق هذه النافذة والعودة للتطبيق</p>
            </div>
          </body>
          </html>
        `);
        mainWindow.webContents.send('oauth-callback', { success: true, code: sallCode, platform: 'salla' });
        resolve(sallCode);
      } else if (sallaError) {
        // Error
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <html dir="rtl">
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial; text-align: center; padding: 50px; background: #dc3545; color: white; }
              .error { background: rgba(0,0,0,0.2); padding: 40px; border-radius: 10px; }
              h1 { margin: 0; font-size: 32px; }
            </style>
          </head>
          <body>
            <div class="error">
              <h1>❌ حدث خطأ</h1>
              <p>${sallaError}</p>
              <p>يمكنك غلق هذه النافذة والمحاولة مرة أخرى</p>
            </div>
          </body>
          </html>
        `);
        mainWindow.webContents.send('oauth-callback', { success: false, error: sallaError, platform: 'salla' });
        reject(sallaError);
      }
    });

    oauthServer.listen(9000, 'localhost', () => {
      console.log('✓ OAuth callback server listening on port 9000');
    });
  });
}

// App ready
app.whenReady().then(() => {
  createWindow();
  createTray();
  startOAuthServer().catch(e => console.error('OAuth server error:', e));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows closed (except macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for renderer communication
ipcMain.handle('get-config', () => {
  return store.store;
});

ipcMain.handle('set-config', (event, key, value) => {
  store.set(key, value);
  return true;
});

ipcMain.handle('get-stores', async () => {
  // Get locally stored connected stores
  const localStores = store.get('connectedStores', []);
  
  // Optionally fetch from Appwrite to sync stores connected via webhook
  try {
    const config = store.store;
    const response = await fetch(
      `${config.appwrite.endpoint}/databases/${config.appwrite.databaseId}/collections/store_connections/documents`,
      {
        headers: {
          'X-Appwrite-Project': config.appwrite.projectId,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.ok) {
      const data = await response.json();
      // Merge remote stores with local ones (avoid duplicates)
      const remoteStores = data.documents?.map(doc => ({
        id: doc.merchantId || doc.$id,
        name: doc.notes?.split(' - ')[1] || 'Salla Store',
        platform: 'salla',
        domain: doc.notes?.split(' - ')[0]?.replace('Connected from ', '') || '',
        connectedAt: doc.createdDate,
        status: doc.connectionStatus
      })) || [];
      
      // Combine and deduplicate
      const allStores = [...localStores];
      remoteStores.forEach(rs => {
        if (!allStores.find(ls => ls.id === rs.id)) {
          allStores.push(rs);
        }
      });
      
      // Update local cache
      store.set('connectedStores', allStores);
      return allStores;
    }
  } catch (err) {
    console.log('Could not fetch remote stores:', err.message);
  }
  
  return localStores;
});

ipcMain.handle('save-store', (event, storeData) => {
  const stores = store.get('connectedStores', []);
  stores.push(storeData);
  store.set('connectedStores', stores);
  return stores;
});

ipcMain.handle('remove-store', (event, storeId) => {
  const stores = store.get('connectedStores', []);
  const filtered = stores.filter(s => s.id !== storeId);
  store.set('connectedStores', filtered);
  return filtered;
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

// Handle OAuth start
ipcMain.handle('start-oauth', async (event, platform) => {
  const config = store.store;
  
  if (platform === 'salla') {
    // For Salla Easy Mode apps, OAuth tokens are delivered via webhook
    // Desktop app cannot receive OAuth callbacks directly (requires HTTPS)
    // 
    // Two options for merchants to install:
    // 1. Published Apps: https://s.salla.sa/apps/install/{appId}
    // 2. Private Apps: Install from Partner Portal "Test App" section
    //
    // After installation, the webhook receives app.store.authorize with tokens
    // Desktop app fetches connected stores from Appwrite database
    
    const appId = config.salla.appId;
    
    // Open the Salla App Store page for your app (works for published apps)
    // For private apps, this will show instructions
    const appUrl = `https://apps.salla.sa/ar/app/${appId}`;
    
    // Alternative for private apps - open Partner Portal
    const partnerPortalUrl = `https://portal.salla.partners/apps/${appId}`;
    
    // Check if we should open app store or partner portal
    shell.openExternal(appUrl);
    
    // Notify user about the process
    mainWindow.webContents.send('oauth-info', {
      platform: 'salla',
      message: 'للتطبيقات الخاصة: قم بتثبيت التطبيق من لوحة الشركاء ثم اضغط تحديث'
    });
    
    return { started: true, platform: 'salla', method: 'app-store' };
  }
  
  if (platform === 'shopify') {
    // Open Shopify connect page
    mainWindow.loadFile('renderer/shopify-connect.html');
    return { started: true, platform: 'shopify' };
  }
  
  return { started: false, error: 'Platform not supported yet' };
});

// Handle Shopify OAuth authorization
ipcMain.handle('shopify-get-auth-url', async (event, shopStore) => {
  try {
    const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || 'YOUR_SHOPIFY_CLIENT_ID';
    const REDIRECT_URI = 'http://localhost:9000/oauth/shopify/callback';
    const SCOPES = [
      'write_products',
      'read_products',
      'read_orders',
      'write_settings',
      'write_theme_asset_modifications',
      'read_theme_asset_modifications'
    ];

    const authUrl = new URL(`https://${shopStore}/admin/oauth/authorize`);
    authUrl.searchParams.append('client_id', SHOPIFY_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.append('scope', SCOPES.join(','));
    authUrl.searchParams.append('state', Math.random().toString(36).substring(7));

    return { 
      success: true, 
      authUrl: authUrl.toString()
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message 
    };
  }
});

