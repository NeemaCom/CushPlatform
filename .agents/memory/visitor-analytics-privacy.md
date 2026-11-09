---
name: Visitor analytics privacy
description: User-approved privacy limits for visitor analytics, IP handling, and retention.
---

Optional visitor analytics must be based on explicit opt-in. Do not store raw IP addresses for behavioral analytics or repurpose the separate security/audit IP records as visitor-tracking data. Keep financial amounts, provider payloads, credentials, and form contents out of analytics events. Detailed visitor events and sessions use a 90-day retention window; withdrawing analytics consent should stop future collection and delete the associated visitor data.

Country reporting is approved only through a self-hosted country database: after current-version analytics consent, process the request IP locally and transiently, store only the approximate two-letter country code on that session, and never send visitor IPs to a hosted lookup provider. Country estimates must stay out of individual visitor views and exports; show only aggregate counts with low-volume groups suppressed.

**Why:** The user chose self-hosted country mapping to avoid sending visitor IPs to a lookup provider, while retaining the existing opt-in, 90-day, and raw-IP limits.

**How to apply:** Before adding new event types, identity linkage, geography, or a longer retention period, update the notice and consent flow. For geography, derive only a coarse country after consent, never retain the source IP, and keep displayed/exported results aggregated.
