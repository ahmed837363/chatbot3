# Cloudflare Worker: Salla webhook proxy

This worker accepts Salla webhook requests on a route such as `https://mayasahstyle.me/salla/webhook` and simply forwards them to your Appwrite function. That gives Salla a trusted domain while your function stays inside Appwrite.

## Setup steps

1. **Install Wrangler (if you haven’t already)**
   ```bash
   npm install -g wrangler
   ```
2. **Authenticate**
   ```bash
   wrangler login
   ```
3. **Set the Appwrite URL**
   ```bash
   wrangler secret put APPWRITE_FUNCTION_URL
   ```
   Paste the function URL (`https://6948f4cc003d4c022adb.fra.appwrite.run/`) when prompted. This keeps secrets out of the repo.
4. **Update `wrangler.toml`**
   - Replace `your-account-id` with the Cloudflare account ID (see dashboard → Overview). 
   - Replace `your-zone-id` if you want Wrangler to manage the route automatically. Otherwise leave it blank and configure the route in the dashboard as `/salla/webhook*`.
5. **Test locally**
   ```bash
   wrangler dev --local
   ```
6. **Publish**
   ```bash
   wrangler publish
   ```

## Git integration

1. Push this folder into your GitHub (or GitLab) repo.
2. In Cloudflare Workers dashboard, go to **Settings → Git integration** and link the repo.
3. Configure the branch you want to deploy (usually `main`).
4. Every push to that branch will trigger Wrangler to build & deploy (Cloudflare handles the pipeline).
5. Keep secrets (`APPWRITE_FUNCTION_URL`) in Cloudflare or GitHub Secrets (never commit them).

## Notes
- The worker’s entry point is `index.js`; you can modify the forwarding logic here if you need custom headers or validation.
- Salla should point its webhook to `https://mayasahstyle.me/salla/webhook` once the route is active.
- After deploying, confirm the worker returns `OK` in the browser and that Appwrite logs the forwarded calls.
