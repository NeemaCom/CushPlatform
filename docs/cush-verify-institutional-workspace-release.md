# Cush Verify institutional workspace release notes

## Database setup

The report and workspace features require:

1. `migrations/manual/create-cush-verify-authorized-reports.sql` if the four report tables are not already present.
2. `migrations/manual/add-cush-verify-workspace-mvp.sql` for the expanded consent categories, email-bound invitation claims, and hashed discovery audit records.

Apply these manually to the Cush Verify database, staging first. Do not run them against Cush Passport or production until the staging schema checks and workflow tests pass. The new migration is additive except for replacing report-category/event-type check constraints with the expanded allowed values; it does not delete report rows.

## Runtime configuration

- `CUSH_PASSPORT_APP_URL` should point to the Passport application receiving individual consent links. It defaults to `https://app.we-cush.com`.
- `SESSION_SECRET` must remain stable while invitations are valid because it is used to hash recipient email identifiers.
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are needed for automatic consent-request email. If mail is unavailable, the workspace returns the expiring link to the approved institution so it can be shared directly.

Invitation tokens are random, expire with the report request, and are bound to an HMAC of the requested email. Claiming requires a signed-in Passport account with that same verified email. Consent is still required before report retrieval.

## Current data and access boundaries

- Discovery supports verified email and an organisation-owned request UUID. There is no canonical Passport-ID field in the current Passport schema, so the workspace does not invent one.
- Income/employment, rent/housing, savings, and financial-commitment sections summarize only matching Cush post-arrival records. Free-text notes and unrequested categories are not included.
- Evidence classes map to the current Passport record states. The application does not currently record an `institution-confirmed` evidence state.
- The workspace report API uses an authenticated institutional web session and the same server-side credit ledger. Machine-to-machine API credentials are not enabled by this release.

## Staging verification checklist

1. Confirm the report tables and new invitation/search columns exist, RLS is enabled, and `anon`/`authenticated` have no table access.
2. Search a verified email and an unknown email; confirm search audit rows contain only digests.
3. Create a request for an existing Passport and for a new email; verify the new-person link rejects another email and can be claimed by the invited verified account.
4. Approve selected categories, decline a separate request, let another expire, and revoke an active authorization.
5. Retrieve an authorized report, repeat retrieval without changing source data, and confirm one delivery/credit use; confirm failed or unauthorized retrieval does not debit credits.
6. Confirm the report contains only consented categories and does not include raw free-text notes, unrequested records, or report contents in audit/billing tables.
