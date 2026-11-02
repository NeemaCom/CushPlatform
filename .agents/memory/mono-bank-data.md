---
name: Mono bank data
description: Provider choice, consent, data retention, and scoring boundaries for bank-account lookups and statements.
---

# Mono bank data

Use Mono for Cush bank-account discovery and statements. These are distinct flows:

- BVN lookup uses the `bank_accounts` scope and requires the user's explicit consent and OTP verification. The provider charges for lookup steps; do not trigger live lookups during development or tests.
- Finding accounts by BVN does not authorize account transaction access. Statements require a separate Mono Connect account-linking authorization.
- Do not log or persist BVNs, OTPs, provider session IDs, full account numbers, or statement payloads. Keep provider account IDs owner-scoped and store lookup-consent evidence without the BVN itself.
- Mono statement data may populate V2 only after explicit consent and user review of recurring income, eligible expenses, and statement completeness. Normalize GBP/USD/NGN to GBP; use the CBN central rate on each transaction date for USD/NGN (current balance uses its snapshot date).
- Production uses only `MONO_LIVE_SECRET_KEY`; development and test use only `MONO_SANDBOX_SECRET_KEY`. Never fall back between them or to a shared key.

**Why:** The user selected Mono for BVN account discovery and connected-bank statements instead of the Interswitch path. The two Mono capabilities require separate user actions. The user approved transaction-date CBN central rates for USD/NGN conversion and reviewed-data-only scoring.

**How to apply:** Mono uses one API host for sandbox and live, with the key selecting the environment. Keep live and sandbox keys in separate hosting secrets; production must require the live key and development/test the sandbox key. Keep Mono secrets in the server environment, require consent before billable BVN lookup and before assessment import, and fetch statements only for the authenticated user's stored Mono account ID. Store derived aggregates and rate provenance only; discard raw statement rows and descriptions. Do not treat a BVN lookup as a connected account or as a credit check.
