---
name: Cush Verify database boundary
description: The dedicated production Supabase project and its separation from Passport data.
---

Cush Verify production uses a dedicated Supabase project separate from CushPlatform/Passport. Institutional accounts, report requests, consents, discovery, pricing, billing, and institutional sessions belong in the Verify database. Passport user and financial records stay in the Passport database and are accessed only by server-side code after explicit, purpose-specific consent.

Passport user and admin IDs stored in Verify are opaque references; do not create cross-database foreign keys. Do not copy Passport user or financial tables when transferring Verify-owned records.

Do not copy billing or Stripe state as part of the ordinary Verify account transfer. Validate that the published version 1 pricing catalog matches the destination seed, and stop for manual review if billing/Stripe rows exist.

**Why:** the user chose a dedicated Verify database to separate the institutional platform from Cush Passport.

**How to apply:** Do not apply Verify migrations to the CushPlatform production database. Keep separate database URLs and session secrets, and route report access through a server-side consent-enforcing boundary. Keep billing state out of a routine move so production Stripe IDs and report credits are not silently duplicated or lost.
