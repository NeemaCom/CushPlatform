---
name: Cush Verify pricing snapshots
description: Pricing versions are immutable after publication; future subscription records should preserve the agreed catalog version and terms.
---

Treat each published Cush Verify pricing catalog as a historical snapshot. Do not make a subscription depend only on whichever catalog is currently published.

**Why:** Public price changes must not silently reprice existing subscriptions or agreements.

**How to apply:** When implementing subscriptions or billing, store the published pricing-version reference and the agreed price/allocation with each agreement. New catalog versions should affect only future agreements unless an explicit renewal or amendment is approved.
