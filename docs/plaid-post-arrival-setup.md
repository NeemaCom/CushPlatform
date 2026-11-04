# Plaid Post-Arrival setup

The Plaid feature is limited to users who have confirmed UK arrival. It requests Plaid Identity and Transactions data for account-holder name, email, phone, and up to 90 days of transactions.

## Apply the database migration

In the intended Supabase project, open **SQL Editor**, create a new query, paste the contents of `migrations/manual/create-cush-plaid-connections.sql`, and run it. The migration creates an encrypted-token connection table, enables row-level security, and removes direct `anon` and `authenticated` access. Do not run the filename as SQL.

The application uses its server-side database connection for these routes. The table intentionally has no Supabase client access policies.

## Configure Plaid on Render

Add these environment variables to the Render service that handles the Cush API:

- `PLAID_CLIENT_ID` — from the Plaid dashboard.
- `PLAID_SECRET` — the secret for the selected Plaid environment.
- `PLAID_ENV` — set to `production` on the Render production service. Use `sandbox` only in a development runtime.
- `PLAID_TOKEN_ENCRYPTION_KEY` — a dedicated 32-byte key encoded as Base64.
- `PLAID_REDIRECT_URI` — optional; set this only if Plaid requires OAuth redirect setup, and register the identical URL in the Plaid dashboard.

Generate an encryption key locally with `openssl rand -base64 32`, then add its output directly in Render's environment settings. Do not paste it into chat, commit it, or reuse `SESSION_SECRET`. Losing or replacing this key makes existing encrypted Plaid tokens unreadable; affected users would need to reconnect.

The Render service runs in production mode, so it requires `PLAID_ENV=production` and matching live Plaid credentials. The app intentionally will not enable sandbox credentials on that production service. Use `PLAID_ENV=sandbox` with sandbox credentials only in a development runtime. Configure production access to the UK Identity and Transactions products in Plaid before enabling live connections.

## User data boundaries

- Plaid access tokens are encrypted at rest with AES-256-GCM and are removed when a user disconnects.
- Identity name, email, and phone are displayed for review. Only fields the user selects can be copied into their editable Post-Arrival profile; the sign-in email is never changed.
- Addresses are neither shown nor copied.
- Transaction details are fetched on demand for a temporary, 90-day review. The app does not store them or use them in the Cush score.
- Mono's separate V2 statement and scoring flow is unchanged.
