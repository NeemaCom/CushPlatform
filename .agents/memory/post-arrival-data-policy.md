---
name: Post-Arrival data policy
description: Product rules for activating and handling UK Post-Arrival information.
---

Post-Arrival activates when the user confirms their actual UK arrival date. Do not require proof of residency or immigration documents just to access the section. Existing users already marked as arrived should not have to repeat confirmation; if their arrival date is unknown, let them add it.

Post-Arrival profile completion and user-entered records do not award points or imply evidence verification. Keep original transaction dates, country, and currency. Only records already eligible under the existing reviewed/provider-backed scoring policy may affect score; do not change scoring formulas as part of Post-Arrival work.

**Why:** The user approved persistent Post-Arrival storage and specified arrival status as the activation criterion while preserving the existing score policy.

**How to apply:** Keep arrival activation independent from document uploads, store user-entered records separately from verified evidence, and keep score updates restricted to the existing eligibility rules.

For Plaid, keep bank linking within Post-Arrival: show account-holder name, email, and phone for user review and optional profile copy; show transaction history only as temporary review data. Do not copy addresses, change sign-in identity, persist transaction details, or feed Plaid transactions into V2 scoring. Keep the existing Mono V2 statement/scoring flow separate.

**Why:** The user selected Plaid identity/contact and transaction review for Post-Arrival while keeping Cush scoring separate.

**How to apply:** Require confirmed UK arrival and explicit consent, encrypt the Plaid connection token, let users disconnect, and require separate policy approval before using Plaid transactions as score evidence.
