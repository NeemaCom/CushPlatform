---
name: Cush Verify report billing boundary
description: Product rule for counting institutional report deliveries without retaining private report contents in billing records.
---

Count a Cush Verify report only after the server has confirmed the institution's tenant access and current individual consent, generated the authorized report, and returned it successfully. A repeated retrieval of identical report content is the same delivery for billing; changed report content may represent a new delivery. Searches, not-found results, consent alone, failures, and technical retries are not billable.

Do not put report contents in audit or billing records. Keep only a stable content fingerprint and minimal delivery metadata.

**Why:** The product rule is to charge only for successfully returned authorized reports, while limiting exposure of private financial data and preventing retries from creating duplicate charges.

**How to apply:** When implementing institutional subscriptions or credit deduction, consume the backend's verified, idempotent delivery events. Never infer charges from client requests, consent records, or endpoint counts.
