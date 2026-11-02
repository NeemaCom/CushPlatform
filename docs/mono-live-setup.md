# Mono live-key setup

Mono's sandbox and production APIs use the same host, `https://api.withmono.com`. The API key determines the environment. This application uses server-generated hosted Connect links, so it needs a secret key on the API server; it does not need a Mono public key in the browser.

## Environment separation

- `NODE_ENV=production` reads **only** `MONO_LIVE_SECRET_KEY`.
- Development and test processes read **only** `MONO_SANDBOX_SECRET_KEY`.
- The previous generic `MONO_SECRET_KEY` is intentionally ignored. The app will not fall back between live and sandbox keys.
- `MONO_REDIRECT_URL` must be the absolute dashboard URL that receives Mono's return code, ending in `/dashboard`. The dashboard handles the code exchange.

## Configure production on Render

1. Confirm Mono has activated the business account and the Mono app is switched to **Live**. Mono's dashboard changes the app keys when switching modes; use the newly issued live secret key.
2. In the `CushPlatform` Render service, open **Environment** and add `MONO_LIVE_SECRET_KEY` with the live secret key value. Enter it directly in Render; do not put it in chat, GitHub, Vercel, Replit Secrets, or source files.
3. Set `MONO_REDIRECT_URL` to the deployed Vercel frontend URL plus `/dashboard` (for example, `https://your-production-frontend.example/dashboard`).
4. Save the environment changes and deploy the code that selects the environment-specific key.
5. In the authenticated dashboard, the Mono status endpoint reports the selected environment and whether its secret is present. This confirms configuration presence only; it does not validate the key with Mono.
6. Test with an explicitly consenting account. Review the returned statement data and consent before importing it into the assessment. Do not import statement data automatically.

For local development, set `MONO_SANDBOX_SECRET_KEY` and a development callback URL in the development server's environment. Never place the live key in a development environment.

Mono's current go-live checklist also calls for account activation, a production webhook URL, and a test webhook. This application currently does not implement Mono webhook handling; validate the consequences for connection changes and disconnections before relying on live account status updates.
