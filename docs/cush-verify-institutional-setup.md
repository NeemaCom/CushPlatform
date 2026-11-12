# Cush Verify institutional account setup

Institutional identities must use a dedicated Firebase project. Do not point
these settings at the Cush Passport project. Institutional accounts use email
and password only; Google sign-in is not offered on Cush Verify.

## Firebase configuration

1. Create or select the dedicated Firebase project for Cush Verify.
2. Register a web app in that project.
3. Enable **Email/Password** under Authentication → Sign-in method. Do not enable
   Google sign-in for this institutional project.
4. Set a strong Firebase password policy (at least 12 characters) and require
   email verification in the institutional registration flow. Add the
   deployed app origin to Firebase Authentication's authorized domains. The
   verification email continues to `/verify/complete`, which accepts the
   invitation only after Firebase confirms the address.
5. Create a service account for the institutional Firebase project. Store its
   project ID, client email, and private key only in the backend host's private
   environment settings.
6. Configure the public web-app settings in the frontend build environment:

   - `VITE_CUSH_VERIFY_FIREBASE_API_KEY`
   - `VITE_CUSH_VERIFY_FIREBASE_AUTH_DOMAIN`
   - `VITE_CUSH_VERIFY_FIREBASE_PROJECT_ID`
   - `VITE_CUSH_VERIFY_FIREBASE_APP_ID`

   Configure these backend-only values on the Node API:

   - `CUSH_VERIFY_FIREBASE_PROJECT_ID`
   - `CUSH_VERIFY_FIREBASE_CLIENT_EMAIL`
   - `CUSH_VERIFY_FIREBASE_PRIVATE_KEY`
   - `CUSH_VERIFY_APP_URL` — the exact deployed frontend origin, without a path.

The public web config is not a credential. Never put the service-account private
key in a `VITE_` variable or commit it to the repository.

## Email delivery and database

- Invitation messages use the existing Resend settings `RESEND_API_KEY` and
  `RESEND_FROM_EMAIL`. The sender domain must be verified in Resend.
- Apply `migrations/manual/create-cush-verify-institutional-accounts.sql` to the
  production PostgreSQL/Supabase project before deploying the API or enabling
  institutional registration.
- Keep the new tables server-only: RLS is enabled and direct `anon` and
  `authenticated` Data API grants are revoked. The application server uses its
  existing PostgreSQL connection.
- The `/verify` application form creates an application only. An authorized
  admin must move it under review, explicitly create the organisation and
  invitation, and later approve the organisation after the invited user has
  registered and verified the official email. Until then, membership remains
  pending and all verification workspace APIs deny access.

## Deployment order

1. Apply the SQL migration.
2. Configure the dedicated Firebase project and environment variables.
3. Configure Resend sender settings and the allowed frontend origin.
4. Deploy the API and frontend together, then test an application, admin invite,
   email verification, invitation acceptance, and the final approval gate.

If institutional Firebase settings are absent, the application form remains
available, but sign-in and invitation acceptance fail closed with a setup
message. Cush Passport continues using its existing Firebase project.
