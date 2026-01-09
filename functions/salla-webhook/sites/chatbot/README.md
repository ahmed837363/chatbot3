<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1VUKdWI41cqRQahg4RumPeLr0W83ArdEP

## Features

- 🧠 Persistent state with local storage for chat history, characters, world info, and settings.
- 🎭 Multi-character roleplay with editable character sheets and AI-assisted evolution.
- 🎙️ Automatic or manual narration streams to keep the story cinematic.
- 🖼️ One-click image prompts plus graceful fallbacks when API services are unavailable.
- 📱 Responsive, mobile-friendly UI with sidebar world-building and session controls.

## Run Locally

**Prerequisites:** Node.js 20+, a Gemini API key.

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Set the `GEMINI_API_KEY` in [.env.local](.env.local).

3. Start the Vite dev server:

   ```powershell
   npm run dev
   ```

4. (Optional) Use VS Code **Go Live** (Live Server extension):

   ```powershell
   npm run build:watch   # keeps dist/ up to date
   ```

   Then click **Go Live** (already configured to serve `dist/` at http://127.0.0.1:5501).

5. Build for production / sanity-check TypeScript:

   ```powershell
   npm run build
   ```

> ℹ️ Video generation requires the AI Studio hosted environment. Locally you'll see a descriptive error if you attempt to trigger it.

## One-command static host + tunnel

For quick mobile previews without retyping commands, use `start-server.ps1`. It rebuilds `dist/`, runs `npx http-server dist -p 3000`, and opens the tunnel provider you choose.

```powershell
# Default: LocalTunnel (same behavior as before)
powershell -ExecutionPolicy Bypass -File "C:\Users\USER\Desktop\New folder (6)\start-server.ps1"

# Skip rebuild if dist/ is already fresh
powershell -ExecutionPolicy Bypass -File "C:\Users\USER\Desktop\New folder (6)\start-server.ps1" -SkipBuild

# Use Cloudflare Tunnel (install cloudflared first: winget install Cloudflare.cloudflared)
powershell -ExecutionPolicy Bypass -File "C:\Users\USER\Desktop\New folder (6)\start-server.ps1" -TunnelProvider cloudflare

# Use ngrok (install ngrok + run `ngrok config add-authtoken <token>` once)
powershell -ExecutionPolicy Bypass -File "C:\Users\USER\Desktop\New folder (6)\start-server.ps1" -TunnelProvider ngrok
```

Each invocation prints the PIDs for the server and tunnel windows. Stop them anytime with `Stop-Process -Id <PID>` or by closing their PowerShell windows.

## Deploy to Google AI Studio

1. **Build the web bundle**

   ```powershell
   npm install
   npm run build
   ```

2. **Create an upload zip** – compress the project folder but exclude `node_modules` and `.env.local` (keep `dist/`). An example PowerShell snippet:

   ```powershell
   $items = Get-ChildItem -Path . -Force | Where-Object { $_.Name -notin @('node_modules','.git','.gitignore','.env.local') }
   Compress-Archive -Path $items -DestinationPath .\gemini-rp-chat-ai-studio.zip -Force
   ```

3. **Upload in AI Studio** – open your app at [ai.studio](https://ai.studio/), choose *Upload/Replace project*, and select the zip.

4. **Configure environment** – inside AI Studio, set `GEMINI_API_KEY` (and any other secrets) under App Settings → Environment variables.

5. **Run and share** – start the hosted preview; the generated HTTPS link works on desktop or mobile, and Android users can use Chrome → *Add to Home screen* for an app-like install.
