---
name: Cush Verify same-origin API
description: Keep institutional session cookies first-party on the Verify custom domain.
---

Requests from `verify.we-cush.com` should use its own origin, with Vercel proxying `/api/*` to Render. Other hosts should continue using the configured `VITE_API_URL`.

**Why:** Institutional authentication uses an HTTP-only session cookie. Calling `cushplatform.onrender.com` directly from `verify.we-cush.com` makes that cookie cross-site and browser privacy controls can drop it after Firebase accepts credentials, returning the user to sign-in.

**How to apply:** Preserve this host split when editing API URL logic, Vercel rewrites, CORS, or session cookies. Verify same-origin `/api/verify/auth/session` and `/api/verify/auth/me`; do not change Passport's API routing without separate review.
