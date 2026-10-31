---
name: Interswitch production checks
description: Provider confirmation required before enabling production credit-history lookups.
---

The supplied Marketplace example did not establish how the returned profile identity relates to the submitted BVN, or whether a credit-history lookup creates a hard/soft bureau inquiry, incurs a fee, or has repeat-request effects. Do not infer these properties from a successful response or from documentation for another Interswitch API. Keep production lookups disabled until Interswitch confirms repayment-status meanings, identity matching, and inquiry/cost behavior in writing. Keep retaining only normalized evidence counts; never store BVNs or raw reports.

**Why:** The supplied request and example response showed different BVN values, and the public page for the specific Marketplace product did not expose endpoint behavior needed to resolve the mismatch or inquiry effects.

**How to apply:** Treat provider examples as illustrative until verified. Set production readiness flags only after confirmation; sandbox evidence must remain excluded from Cush scoring.
