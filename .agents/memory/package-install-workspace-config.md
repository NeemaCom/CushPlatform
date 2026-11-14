---
name: Package installs and workspace settings
description: Replit package operations can adjust launcher configuration alongside dependencies.
---

Some package-management operations may add or alter workspace launcher settings even when the requested change is only a dependency update. Compare launcher configuration against its baseline and restore unrelated generated changes through the platform's validated configuration flow.

**Why:** Package operations can apply workspace-level changes that affect the development environment independently of the dependency update.

**How to apply:** After package updates, inspect launcher configuration and keep only intentional changes.
