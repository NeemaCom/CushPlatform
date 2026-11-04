---
name: Portable npm lockfiles
description: Non-obvious local npm metadata behavior when generating portable dependency locks
---

When a lockfile is regenerated in a workspace that already has installed packages, npm can reuse registry URLs from local install metadata even if the active registry is public. Removing that metadata and using lockfile-only resolution can remove those URLs but can also omit dependency edges until a normal install reconciles the lock. Installing a package already present in devDependencies without explicitly changing its classification may update its version but leave it as a dev dependency.

Vercel cannot resolve `package-firewall.replit.internal`. An existing lockfile with that host may remain unchanged after `npm install --package-lock-only --registry=https://registry.npmjs.org`; in that case, canonicalize the resolved tarball URLs to the public npm host and remove the firewall-only `/npm/` path prefix. Keep the locked versions and integrity hashes unchanged when only correcting registry locations.

**Why:** A public-registry install initially retained hundreds of internal URLs; a lockfile-only rebuild then failed `npm ci --dry-run` until a normal install reconciled it. An install of an existing dev dependency also retained its dev classification, contrary to the intended production-install fix.

**How to apply:** For registry portability, inspect all resolved lockfile hosts and verify `npm ci --dry-run` after generation. Do not assume that changing the active npm registry alone rewrites an existing dependency tree. When correcting a lockfile host, compare versions and integrity hashes before and after. When promoting a package to production dependencies, verify both the manifest and lockfile root declarations and the installed package's dev flag.