---
name: Visitor analytics privacy
description: User-approved privacy limits for visitor analytics, IP handling, and retention.
---

Optional visitor analytics must be based on explicit opt-in. Do not store raw IP addresses for behavioral analytics or repurpose the separate security/audit IP records as visitor-tracking data. Keep financial amounts, provider payloads, credentials, and form contents out of analytics events. Detailed visitor events and sessions use a 90-day retention window; withdrawing analytics consent should stop future collection and delete the associated visitor data.

**Why:** The user previously chose analytics only after opt-in and limited raw IP retention to security purposes. The current visitor-intelligence work resumes analytics only with an in-product choice and an updated privacy notice.

**How to apply:** Before adding new event types, identity linkage, geography, or a longer retention period, update the notice and consent flow. For geography, prefer deriving a coarse location transiently without retaining the source IP.
