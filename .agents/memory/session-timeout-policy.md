---
name: Cush session timeout
description: The user-facing idle sign-out threshold and consistency requirement.
---

Cush signs users out after 20 minutes without activity. Keep browser inactivity handling and server session expiry aligned to the same threshold; authenticated activity should refresh the server session, while inactivity must not.

**Why:** The user explicitly requested automatic sign-out after 20 minutes of inactivity.

**How to apply:** Preserve the 20-minute limit across client and server changes, including session cookies, cross-tab activity, and expired-session recovery.
