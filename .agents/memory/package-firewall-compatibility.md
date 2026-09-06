---
name: Package firewall compatibility
description: Replit package installation can reject vulnerable transitive tarballs from imported lockfiles.
---

When an imported npm lockfile is blocked by the package firewall, update the blocked transitive package to the newest compatible release and keep the lockfile integrity metadata in sync rather than bypassing the firewall.

**Why:** The imported project could not install until several compatible transitive packages were moved off blocked releases; bypassing the firewall would undermine the environment's dependency safety checks.

**How to apply:** Inspect the blocked package's dependency range and registry metadata, prefer a same-major compatible release, update package overrides when needed, and rerun `npm ci`.