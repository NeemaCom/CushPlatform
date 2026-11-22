---
name: Post-Arrival data policy
description: Product rules for activating and handling UK Post-Arrival information.
---

Post-Arrival activates when the user confirms their actual UK arrival date. Do not require proof of residency or immigration documents just to access the section. Existing users already marked as arrived should not have to repeat confirmation; if their arrival date is unknown, let them add it.

Post-Arrival profile completion and user-entered records do not imply evidence verification. Keep original dates, country, and currency. Under the user's later direction, manual financial profile entries in both Pre-Arrival and Post-Arrival may affect provisional Score components as self-reported data and receive 5 source-quality Confidence points only after an authorized policy version is activated. They never satisfy final-score verification gates. Store recognized ISO currencies unchanged; score GBP directly and use existing dated CBN conversion for USD/NGN. No other FX source has been approved, so other currencies remain unscored until a dated rate source is approved. Plaid activity remains separate until an explicit integration/policy change.

**Why:** The user first kept Post-Arrival scoring separate, then later explicitly directed that manual entries in both periods should influence provisional Score and Confidence, with 5 self-declared source-quality points; this later direction supersedes the earlier no-score rule. The user also asked for international currencies but did not select a conversion provider, so guessing exchange rates would be unsafe.

**How to apply:** Keep arrival activation independent from document uploads, store manual records as self-reported, normalize only with approved dated exchange rates, preserve final-score verification gates and weights, and never label manual or Plaid data as verified.

For Plaid, keep bank linking within Post-Arrival: show account-holder name, email, and phone for user review and optional profile copy; show transaction history only as temporary review data. Do not copy addresses, change sign-in identity, persist transaction details, or feed Plaid transactions into V2 scoring. Keep the existing Mono V2 statement/scoring flow separate.

**Why:** The user selected Plaid identity/contact and transaction review for Post-Arrival while keeping Cush scoring separate.

**How to apply:** Require confirmed UK arrival and explicit consent, encrypt the Plaid connection token, let users disconnect, and require separate policy approval before using Plaid transactions as score evidence.

Keep Plaid in sandbox mode until live credentials and production access are ready. If sandbox is intentionally enabled on the production-hosted service for testing, require an explicit opt-in and show users a clear test-data warning.

**Why:** The user wants to test Plaid in sandbox before moving to production details.

**How to apply:** Use sandbox credentials with `PLAID_ENV=sandbox`; require the production sandbox opt-in flag on Render and remove it when switching to live credentials.
