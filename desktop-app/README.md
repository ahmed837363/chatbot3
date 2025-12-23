# Chatbot Manager - Desktop App

A beautiful desktop application to manage chatbot integrations for e-commerce stores.

## Features

- 🏪 **Store Management** - Connect and manage multiple e-commerce stores
- 🔗 **Salla Integration** - Full support for Salla e-commerce platform (Saudi Arabia)
- 💬 **Chatbot Widget** - Automatically install chatbot on connected stores
- 📊 **Dashboard** - Overview of all connected stores and conversations
- ⚙️ **Settings** - Configure AI models, widget appearance, and more
- 🔔 **System Tray** - Runs in background with tray icon

## Supported Platforms

| Platform | Status |
|----------|--------|
| Salla (سلة) | ✅ Available |
| Shopify | ⏳ Coming Soon |
| WooCommerce | ⏳ Coming Soon |
| Zid (زد) | ⏳ Coming Soon |

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

```bash
# Navigate to desktop-app folder
cd desktop-app

# Install dependencies
npm install

# Run the app
npm start
```

### Build for Distribution

```bash
# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for both
npm run build:all
```

## Configuration

The app stores configuration in:
- Windows: `%APPDATA%/chatbot-saas-manager/config.json`
- macOS: `~/Library/Application Support/chatbot-saas-manager/config.json`

### Default Configuration

```json
{
  "appwrite": {
    "endpoint": "https://fra.cloud.appwrite.io/v1",
    "projectId": "694669640010920ea3f6",
    "databaseId": "6946699d001194236820"
  },
  "salla": {
    "clientId": "d57bh-4f5-ed26-4a09-Babo-03e9384dfd894",
    "appId": "1628541854"
  },
  "webhookUrl": "https://6948f4cc003d4c022adb.fra.appwrite.run"
}
```

## Project Structure

```
desktop-app/
├── main.js           # Electron main process
├── preload.js        # Secure bridge between main and renderer
├── package.json      # Dependencies and scripts
├── renderer/
│   ├── index.html    # Main UI
│   ├── styles.css    # Styling
│   └── app.js        # UI logic
└── assets/
    └── icon.svg      # App icon
```

## How It Works

1. **Connect Store**: Click "ربط متجر" and select Salla
2. **Authorize**: Log in to Salla and approve permissions
3. **Webhook**: Salla sends authorization to your Appwrite function
4. **Auto-Install**: Chatbot widget is installed on the store
5. **Manage**: View and manage connected stores from the dashboard

## License

MIT
