const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, shell } = require('electron');
const path = require('path');
const Store = require('electron-store');

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

// App ready
app.whenReady().then(() => {
  createWindow();
  createTray();

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

// Handle OAuth callback
ipcMain.handle('start-oauth', async (event, platform) => {
  const config = store.store;
  
  if (platform === 'salla') {
    const authUrl = `https://accounts.salla.sa/oauth2/auth?client_id=${config.salla.clientId}&response_type=code&scope=offline_access`;
    shell.openExternal(authUrl);
    return { started: true, platform: 'salla' };
  }
  
  return { started: false, error: 'Platform not supported yet' };
});
