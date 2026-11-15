---
name: Cush Verify Stripe runtime
description: Runtime credential and webhook boundary for Cush Verify billing across Replit and Render.
---

The deployed Cush Verify service runs outside Replit. Use the official Stripe SDK with credentials and the signed webhook secret configured in the hosting service's environment; a connected Replit Stripe integration is workspace tooling, not a runtime credential source.

**Why:** Cush Verify is hosted on Render, and the Replit integration cannot configure the deployed service's environment.

**How to apply:** Keep Stripe billing disabled until the database migration, mapped prices, host secrets, and webhook are verified. Use Stripe test keys only in development or an explicitly test-enabled staging service; production main must use live-mode credentials.
