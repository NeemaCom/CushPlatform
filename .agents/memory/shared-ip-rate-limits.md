---
name: Shared IP rate limits
description: Durable design rule for production IP-based request limits.
---

Authentication rate limits that must hold in production should use shared database-backed counters, not per-process memory. Persist keyed IP digests rather than raw addresses, and derive client IPs only through the configured trusted proxy chain.

**Why:** Render processes can restart or scale independently; local counters reset or diverge, weakening limits.

**How to apply:** Use atomic shared storage for authentication limits and expire inactive counters. Keep the shared table inaccessible to browser-facing database roles.
