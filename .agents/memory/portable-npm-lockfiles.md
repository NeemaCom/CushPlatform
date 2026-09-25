---
name: Portable npm lockfiles
description: Non-obvious local npm metadata behavior when generating portable dependency locks
---

When a lockfile is regenerated in a workspace that already has installed packages, npm can reuse registry URLs from local install metadata even if the active registry is public. Removing that metadata and using lockfile-only resolution can remove those URLs but can also omit dependency edges until a normal install reconciles the lock.

**Why:** A public-registry install initially retained hundreds of internal URLs; a lockfile-only rebuild then failed `npm ci --dry-run` until a normal install reconciled it.

**How to apply:** For registry portability, inspect all resolved lockfile hosts and verify `npm ci --dry-run` after generation. Do not assume that changing the active npm registry alone rewrites an existing dependency tree.