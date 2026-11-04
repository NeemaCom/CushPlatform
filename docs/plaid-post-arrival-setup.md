# Plaid Post-Arrival setup

The Plaid feature is limited to users who have confirmed UK arrival. It requests Plaid Identity and Transactions data for account-holder name, email, phone, and up to 90 days of transactions.

## Apply the database migration

In the intended Supabase project, open **SQL Editor**, create a new query, paste the contents of `migrations/manual/create-cush-plaid-connections.sql`, and run it. The migration creates an encrypted-token connection table, enables row-level security, and removes direct `anon` and `authenticated` access. Do not run the filename as SQL.

The application uses its server-side database connection for these routes. The table intentionally has no Supabase client access policies.

## Configure Plaid on Render

Add these environment variables to the Render service that handles the Cush API:

- `PLAID_CLIENT_ID` — from the Plaid dashboard.
- `PLAID_SECRET` — the secret for the selected Plaid environment.
- `PLAID_ENV` — `sandbox` for sandbox credentials or `production` for live credentials.
- `PLAID_ALLOW_SANDBOX_IN_PRODUCTION` — set to `true` only when intentionally running sandbox credentials on the Render production service for testing; omit it in development and remove it for live production.
- `PLAID_TOKEN_ENCRYPTION_KEY` — a dedicated 32-byte key encoded as Base64.
- `PLAID_REDIRECT_URI` — optional; set this only if Plaid requires OAuth redirect setup, and register the identical URL in the Plaid dashboard.

Generate an encryption key locally with `openssl rand -base64 32`, then add its output directly in Render's environment settings. Do not paste it into chat, commit it, or reuse `SESSION_SECRET`. Losing or replacing this key makes existing encrypted Plaid tokens unreadable; affected users would need to reconnect.

For sandbox testing on Render, set `PLAID_ENV=sandbox`, provide sandbox `PLAID_CLIENT_ID` and `PLAID_SECRET`, and explicitly set `PLAID_ALLOW_SANDBOX_IN_PRODUCTION=true`. The Post-Arrival panel displays a test-only warning in this mode. Do not treat sandbox results as real financial data.

For live use, set `PLAID_ENV=production`, provide matching live credentials, and remove `PLAID_ALLOW_SANDBOX_IN_PRODUCTION`. Configure production access to the UK Identity and Transactions products in Plaid before enabling live connections. Sandbox connections must be linked again after switching to production.

## User data boundaries

- Plaid access tokens are encrypted at rest with AES-256-GCM and are removed when a user disconnects.
- Identity name, email, and phone are displayed for review. Only fields the user selects can be copied into their editable Post-Arrival profile; the sign-in email is never changed.
- Addresses are neither shown nor copied.
- Transaction details are fetched on demand for a temporary, 90-day review. The app does not store them or use them in the Cush score.
- Mono's separate V2 statement and scoring flow is unchanged.
