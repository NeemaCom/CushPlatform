---
name: Render provider credentials
description: Production integrations for services deployed outside Replit.
---

Production services hosted on Render must receive third-party provider credentials through Render's environment settings. A Replit-connected integration can be used by the Replit workspace but is not automatically available to a Render process.

**Why:** Cush's API is deployed on Render while the Resend connection is managed by Replit. The connected Resend credential is sending-only and cannot be used to inspect account domain configuration; Render needs its own credential and verified sender configuration.

**How to apply:** For external production services, use the provider's server-side API from app code and read credentials only from environment variables configured in the hosting service. Prefer minimum-scope keys; never copy credential values into source, logs, or chat.
