---
name: Cush Verify activation policy
description: User-approved access rule for self-service institutional onboarding.
---

Cush Verify remains separate from Cush Passport and uses email/password sign-in. A new institution submits its application, receives a one-time activation link at its official business email, sets its password, and gains an active initial administrator membership and full workspace access after activation. Manual admin review, invitation, and final approval are not prerequisites.

After successful official-email activation, each new Cush Verify institution receives five promotional report credits. The grant is institution-level, non-monetary, recorded in the append-only credit ledger, and must not bypass the individual’s explicit report consent.

**Why:** The user explicitly chose immediate full workspace access after email activation and requested five promotional credits for every Cush Verify account after activation.

**How to apply:** Use expiring, one-time activation tokens stored securely; preserve duplicate checks and audit logging; never link the identity to a Passport account. Grant the five credits in the activation transaction using an idempotency key and ledger entry. Email activation verifies mailbox control, not the institution’s legal identity.

For an already-approved institution, its active organisation administrators may invite named colleagues at any official email domain. After the invitee verifies mailbox ownership, activate the invited membership without an additional Cush Admin approval step. Cush Admin retains the ability to revoke membership access. Email verification alone does not prove that an address or domain belongs to the institution.

**Why:** The user explicitly allowed other official email domains and removed Cush Admin approval from invited team-member onboarding.

**How to apply:** Keep initial organisation approval separate from colleague invitations. Require an active organisation administrator, a one-time expiring invitation, verified email ownership, and server-side role checks; log invitation and revocation events, and do not claim that a domain or legal identity was independently verified.
