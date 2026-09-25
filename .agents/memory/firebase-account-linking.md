---
name: Firebase account linking
description: Security boundary for attaching Firebase identities to existing accounts
---

Do not automatically attach a Firebase identity to an existing password-based account just because its verified ID token contains a matching email. Look up returning Firebase users by verified UID, and require an explicit linking flow authenticated through the account's existing method before adding a new UID.

**Why:** Email equality does not prove the Firebase identity is authorized to take over a pre-existing account, especially when email verification and old account ownership may differ. Rejecting a matching email can block a legitimate user's first Firebase login, but that is safer than automatic account takeover.

**How to apply:** When changing signup, sign-in, migration, or provider linking, preserve the UID-only authentication boundary. Implement a separate, authenticated linking flow if existing password-account holders need Firebase sign-in.