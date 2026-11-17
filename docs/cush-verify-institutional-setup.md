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
   deployed app origin to Firebase Authentication's authorized domains.
   Self-service signups are created disabled and unverified; the activation
   flow enables the Firebase identity only after the one-time link is confirmed.
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

- Activation and any legacy invitation messages use the existing Resend
  settings `RESEND_API_KEY` and `RESEND_FROM_EMAIL`. The sender domain must be
  verified in Resend.
- Apply `migrations/manual/create-cush-verify-institutional-accounts.sql` to the
  production PostgreSQL/Supabase project before deploying the API or enabling
  institutional registration.
- Apply `migrations/manual/create-cush-verify-email-activations.sql` before
  deploying the self-service activation flow.
- Keep the new tables server-only: RLS is enabled and direct `anon` and
  `authenticated` Data API grants are revoked. The application server uses its
  existing PostgreSQL connection.
- New `/verify/apply` submissions collect account credentials and institution
  details together. The password is sent to Firebase Admin over TLS and is not
  stored in PostgreSQL. The application record and a hash of the activation
  token are stored server-side; the one-time token is sent only in the official
  email link fragment.
- Confirming the activation link verifies the business email, creates the
  institution and an active `organisation_admin` membership, and enables the
  Firebase identity. The full workspace opens after the user signs in.
- The older admin review and invitation endpoints remain for existing
  invitation records; they are not part of new self-service signups.

## Deployment order

1. Apply the SQL migration.
2. Configure the dedicated Firebase project and environment variables.
3. Configure Resend sender settings and the allowed frontend origin.
4. Deploy the API and frontend together, then test a new application, activation
   email delivery, single-use link behavior, sign-in, and full workspace access.
   Verify that existing invitation records still follow their legacy flow.

If institutional Firebase settings are absent, the application form remains
available, but sign-in and invitation acceptance fail closed with a setup
message. Cush Passport continues using its existing Firebase project.
