---
name: Mono bank data
description: Provider choice, consent, data retention, and scoring boundaries for bank-account lookups and statements.
---

# Mono bank data

Use Mono for Cush bank-account discovery and statements. These are distinct flows:

- BVN lookup uses the `bank_accounts` scope and requires the user's explicit consent and OTP verification. The provider charges for lookup steps; do not trigger live lookups during development or tests.
- Finding accounts by BVN does not authorize account transaction access. Statements require a separate Mono Connect account-linking authorization.
- Do not log or persist BVNs, OTPs, provider session IDs, full account numbers, or statement payloads. Keep provider account IDs owner-scoped and store lookup-consent evidence without the BVN itself.
- The V2 assessment accepts GBP only. Mono statements may be NGN and must not be converted or automatically scored until the currency policy and evidence mapping are explicitly approved.

**Why:** The user selected Mono for BVN account discovery and connected-bank statements instead of the Interswitch path. The two Mono capabilities require separate user actions, and the user's scoring policy disallows guessed currency conversion.

**How to apply:** Keep Mono secret keys in the production server environment, require consent before billable BVN lookup, and fetch statements only for the authenticated user's stored Mono account ID. Do not treat a BVN lookup as a connected account or as a credit check.
