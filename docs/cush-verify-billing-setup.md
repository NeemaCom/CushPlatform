# Cush Verify billing setup

Paid subscriptions and Stripe overage collection are disabled by default. The app can still use credits an administrator has explicitly added as a promotion or adjustment.

## 1. Apply the database migration

Run `migrations/manual/create-cush-verify-billing-ledger.sql` in the Cush Verify Supabase project's SQL editor. The migration is additive, enables row-level security, grants no direct client access, and makes the credit ledger append-only.

The server returns `CUSH_VERIFY_BILLING_SCHEMA_REQUIRED` until the migration is present. Do not set `CUSH_VERIFY_BILLING_ENABLED=true` before applying and checking the migration.

## 2. Prepare Stripe in test mode

Use the same Stripe account that will own Cush Verify subscriptions. Test in the Replit preview or a separate Render staging service first. Add these variables to that non-production environment, using secret fields for the two Stripe secrets:

- `STRIPE_SECRET_KEY` — Stripe test-mode secret key for the first test run.
- `STRIPE_WEBHOOK_SECRET` — signing secret for the webhook endpoint below.
- `CUSH_VERIFY_BILLING_ENABLED` — set to `true` only after the test-mode webhook and prices are configured.
- `CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION` — set to `true` only on a separate staging service if it runs with `NODE_ENV=production`; never set it on production `main`.
- `CUSH_VERIFY_PAYMENT_GRACE_DAYS` — optional integer from 1 to 30; defaults to 7.

The Replit Stripe connection is for workspace tooling; it does not provide credentials to the Render runtime. Never put secret values in source code, this document, or client-side variables.

## 3. Create the Stripe catalog mappings

Run the setup script in a trusted environment with `CUSH_VERIFY_DATABASE_URL` pointing to the **isolated staging Cush Verify database** and `STRIPE_SECRET_KEY` set to a Stripe **test** key. Also set `CUSH_VERIFY_DEPLOYMENT_ENV=staging`. Never point a test key at the production database or reuse the Passport `DATABASE_URL`. If the staging service runs with `NODE_ENV=production`, set `CUSH_VERIFY_ALLOW_TEST_MODE_IN_PRODUCTION=true` on that staging service only.

```sh
npx tsx scripts/setup-cush-verify-stripe-prices.ts
```

It connects directly to `CUSH_VERIFY_DATABASE_URL` (not the general Passport `DATABASE_URL`), verifies the database TLS certificate, creates or reuses one Stripe product per self-service plan and monthly/annual recurring prices, then stores the exact price IDs and catalog terms in that Verify database. It skips contact-sales and sandbox-only plans. The script does not charge a customer. It requires the deployment marker to match the Stripe key mode and rejects changed terms in an already-published version; publish a new pricing version before changing prices.

Test the script and checkout in Stripe test mode first. Creating live products and prices requires `CUSH_VERIFY_DEPLOYMENT_ENV=production`, both the `--confirm-live` flag and `CONFIRM_LIVE_STRIPE_PRICE_SETUP=YES`; do not use those until production pricing is approved. Production `main` accepts only a live Stripe key.

## 4. Add the Stripe webhook

Configure a Stripe webhook for the deployed API origin with this path:

```text
/api/verify/billing/stripe/webhook
```

Subscribe to these event types:

- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Copy the endpoint's signing secret into Render's `STRIPE_WEBHOOK_SECRET`. The webhook verifies Stripe's signature and records event IDs so retries cannot allocate credits twice.

## 5. Confirm billing behavior before live mode

- One new, authorized full report deducts one credit; a repeated retrieval of the same report does not deduct another.
- Each new institutional account receives five promotional report credits after official email activation. The grant is recorded once in the credit ledger and does not create a Stripe charge.
- Searches, missing profiles, declined consent, consent alone, failed requests, and individual report endpoints do not deduct credits.
- When included credits run out, an eligible overage creates a Stripe invoice item with an idempotency key. Stripe collects it on the applicable invoice; transient failures are retried.
- Unused credits carry forward in full. Annual plans are charged on their annual invoice while report credits are released monthly.
- A canceled subscriber may use credits already paid for, but cannot accrue new plan allocations or overages. A failed subscription remains available during its grace period and is suspended after the grace period ends.
- Admin credit adjustments and reversals are tenant-scoped, append-only ledger events and require an admin audit record. Reversing a monetary charge requires a separate Stripe refund workflow.

Keep `CUSH_VERIFY_BILLING_ENABLED` unset or `false` until the test-mode checks pass. Production `main` requires live-mode Stripe credentials and a live-mode webhook secret in Render; do not enable production collection until live pricing and terms have been approved.
