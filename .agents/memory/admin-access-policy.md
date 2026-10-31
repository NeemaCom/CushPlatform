---
name: Admin access policy
description: User-stated default role and safe admin provisioning expectations.
---

# Admin access policy

Ordinary registered users must retain the `user` role. Admin privileges must be explicitly provisioned and enforced on the server; do not infer them from email, signup data, or frontend state.

**Why:** The user explicitly instructed that the default user role remain `user` while planning the administration dashboard.

**How to apply:** Preserve `user` as the ordinary-account role when aligning signup and database defaults. Keep admin elevation out of public registration and client-controlled flows.
