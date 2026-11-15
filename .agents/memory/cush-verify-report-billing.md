---
name: Cush Verify report billing boundary
description: Product rule for counting institutional report deliveries without retaining private report contents in billing records.
---

Count a Cush Verify report only after the server has confirmed the institution's tenant access and current individual consent, generated the authorized report, and returned it successfully. A repeated retrieval of identical report content is the same delivery for billing; changed report content may represent a new delivery. Searches, not-found results, consent alone, failures, and technical retries are not billable.

Do not put report contents in audit or billing records. Keep only a stable content fingerprint and minimal delivery metadata.

Unused report credits carry forward in full. Annual plans are charged annually while included credits are released monthly. Credits already paid for remain usable after cancellation, but a canceled account receives no new allocation or overage access.

**Why:** The user selected full credit rollover. Billing should still count only successfully returned authorized reports, limit exposure of private financial data, and prevent retries from creating duplicate charges.

**How to apply:** Consume backend-verified, idempotent report-delivery events. Carry the full balance across renewals, release annual-plan credits monthly, and do not revoke prepaid remaining credits on cancellation. Never infer charges from client requests, consent records, or endpoint counts.
