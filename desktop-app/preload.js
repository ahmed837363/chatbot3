const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),
  
  // Store Management
  getStores: () => ipcRenderer.invoke('get-stores'),
  saveStore: (storeData) => ipcRenderer.invoke('save-store', storeData),
  removeStore: (storeId) => ipcRenderer.invoke('remove-store', storeId),
  
  // OAuth
  startOAuth: (platform) => ipcRenderer.invoke('start-oauth', platform),
  onOAuthCallback: (callback) => ipcRenderer.on('oauth-callback', (event, data) => callback(data)),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Navigation listener
  onNavigate: (callback) => ipcRenderer.on('navigate', (event, page) => callback(page)),
  
  // Platform info
  platform: process.platform
});
