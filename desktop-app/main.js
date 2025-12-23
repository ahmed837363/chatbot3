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
      clientId: 'd57bh-4f5-ed26-4a09-Babo-03e9384dfd894',
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

// Start OAuth callback server
function startOAuthServer() {
  return new Promise((resolve, reject) => {
    oauthServer = http.createServer((req, res) => {
      const urlObj = new URL(req.url, 'http://localhost:9000');
      const code = urlObj.searchParams.get('code');
      const error = urlObj.searchParams.get('error');

      if (code) {
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
        mainWindow.webContents.send('oauth-callback', { success: true, code });
        resolve(code);
      } else if (error) {
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
              <p>${error}</p>
              <p>يمكنك غلق هذه النافذة والمحاولة مرة أخرى</p>
            </div>
          </body>
          </html>
        `);
        mainWindow.webContents.send('oauth-callback', { success: false, error });
        reject(error);
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
  // This will be replaced with actual Appwrite calls
  return store.get('connectedStores', []);
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
    // Using Easy Mode - no redirect needed
    const authUrl = `https://accounts.salla.sa/oauth2/auth?` +
      `client_id=${config.salla.clientId}` +
      `&response_type=code` +
      `&redirect_uri=http://localhost:9000/callback` +
      `&scope=offline_access`;
    
    shell.openExternal(authUrl);
    return { started: true, platform: 'salla' };
  }
  
  return { started: false, error: 'Platform not supported yet' };
});

