# Account status email setup

Account suspension and reactivation emails are sent by the Render-hosted API
through Resend. The Replit Resend connection is not available to the Render
service, so production must have its own Resend credentials.

## Render environment variables

In the CushPlatform Render web service, add:

- `RESEND_API_KEY`: a Resend **sending-only** API key, preferably restricted to
  the verified Cush sending domain. Add it as a secret in Render; never commit
  it or paste it into chat.
- `RESEND_FROM_EMAIL`: a sender address on a domain verified for sending in
  Resend, for example `Cush Support <support@we-cush.com>` only if that exact
  domain/address is verified.

The API replies to `support@we-cush.com`. If either variable is missing or
Resend rejects delivery, the account status change still completes, but the
admin response and audit record indicate that the notice was not sent.

## Email behavior

- A notice is sent only when an account status actually changes.
- Reapplying the same status does not send another email.
- Suspension notices explain that sign-in is blocked and account data was not
  deleted.
- Reactivation notices include the Cush sign-in URL.
- Email delivery happens after the account/session transaction commits. A mail
  failure never rolls back a suspension or reactivation.

## Test delivery from the admin dashboard

An authenticated administrator with integration-management permission can use
**Test account-status email** on the admin overview. The endpoint sends only to
that administrator's verified account email, requires the normal admin session
and trusted app origin, and is limited to one request per minute. The test
message confirms Resend delivery and explicitly states that it did not change
any account status.

Use a dedicated test account if you also need to verify the actual suspension
and reactivation templates. The test-email action does not exercise or mutate
those account-status flows.
