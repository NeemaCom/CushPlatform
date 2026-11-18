# Cush Verify dedicated Supabase database

Cush Verify now has a separate database connection from Cush Passport. Keep the
Passport database and session settings unchanged; Verify uses its own database
and session store.

## Before changing a deployed service

1. Create the Verify database in the dedicated Supabase project.
2. Apply the Verify schema migrations below.
3. Choose one cutover path:
   - **Preserve existing records:** run the data-transfer script in dry-run mode,
     review its counts, then run it with `--apply` to copy Verify-owned records.
     Do not copy Passport user or financial tables. The script checks that the
     published version 1 catalog matches and refuses to transfer billing/Stripe
     state.
   - **Start clean:** skip the transfer. The source database remains untouched,
     but the approved test institution, institutional logins, and request history
     must be recreated in the dedicated Verify database after cutover.
4. Only after the selected path is complete, configure the application to use
   this database and verify institutional sign-in.

## Apply the schema migrations in order

Run each SQL file's contents in the new project's Supabase SQL Editor. These
files contain SQL only; do not paste their filenames or surrounding instructions
into the editor.

1. `migrations/manual/create-cush-verify-institutional-accounts.sql`
2. `migrations/manual/create-cush-verify-email-activations.sql`
3. `migrations/manual/create-cush-verify-institution-interests.sql`
4. `migrations/manual/add-cush-verify-institution-interest-details.sql`
5. `migrations/manual/create-cush-verify-authorized-reports.sql`
6. `migrations/manual/add-cush-verify-workspace-mvp.sql`
7. `migrations/manual/create-cush-verify-pricing-catalog.sql`
8. `migrations/manual/add-cush-verify-pricing-faqs.sql` (only if the pricing
   catalog migration did not already create and seed the FAQ items)
9. `migrations/manual/create-cush-verify-billing-ledger.sql`
10. `migrations/manual/create-cush-verify-sessions-table.sql`
11. `migrations/manual/add-cush-verify-team-management.sql`

The schema stores Passport user and admin IDs as opaque references where needed.
There are no foreign keys from the Verify database to Passport's database.
Internal foreign keys between Verify-owned tables remain enforced.

## Transfer existing Verify records

Run the script from the repository root in a trusted environment where both
database URLs are provided privately to the process:

- `CUSH_VERIFY_SOURCE_DATABASE_URL`: the current database that contains the
  Verify records.
- `CUSH_VERIFY_DATABASE_URL`: the dedicated Verify target database.

First run the read-only preflight:

```sh
node scripts/migrate-cush-verify-data.mjs
```

Only after reviewing the output, run the write operation:

```sh
node scripts/migrate-cush-verify-data.mjs --apply
```

The script verifies the Supabase project refs differ, checks target tables are
empty, validates the target's published version 1 pricing seed against the
source, and copies only Verify-owned institutional and report records in
dependency order. It does not modify the source database, copy Passport data,
copy sessions, or transfer Stripe/billing records. If any billing/Stripe rows
exist in the source, or if the catalog differs, it stops without copying; review
those records separately rather than risking credits or production Stripe IDs.
Institutional users will sign in again after the cutover.

## Configure the server

Add these server-side environment values to the Verify Render service:

- `CUSH_VERIFY_DATABASE_URL`: the new project's Supabase **session pooler**
  connection string. Store it as a secret; never paste it into chat or a
  `VITE_` variable.
- `CUSH_VERIFY_SESSION_SECRET`: a unique random value of at least 32 characters,
  stored as a secret.

Keep `DATABASE_URL` and `SESSION_SECRET` pointed at the existing Passport
database. They continue to serve Passport accounts and sessions.

The frontend marks Verify requests with `X-Cush-Product: verify`. The server
uses that marker to select the Verify session cookie and store; Passport requests
continue using the existing Passport session.

## Verify before switching traffic

- Confirm all Verify tables exist and have row-level security enabled.
- Confirm `anon` and `authenticated` have no direct table access.
- Confirm the approved institutional account and its membership were transferred.
- Confirm the target's published pricing version and plans match the source.
- Confirm a Verify sign-in and a Passport sign-in still use their separate sessions.
- Confirm an authorised report can be generated, and that declined or revoked
  consent blocks retrieval.
- Keep Stripe billing disabled until its staging and production checks are complete.
