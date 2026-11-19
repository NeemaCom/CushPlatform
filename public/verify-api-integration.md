# Cush Verify API integration guide

This guide describes the implemented version 1 institutional API. It does not grant production access. Production calls require an approved organisation, Cush approval of the API access request, an active eligible subscription, and a production key with the required scope.

## 1. API description and base URL

- Interactive API page: `https://verify.we-cush.com/verify/api-reference`
- OpenAPI 3.0 JSON: `https://verify.we-cush.com/openapi/cush-verify-v1.json`
- Production base URL: `https://verify.we-cush.com/api/v1`
- Sandbox endpoints use the same host with a sandbox key and the `/sandbox` routes.

Use the `X-Request-Id` response header when asking Cush Support to investigate a request. Rate-limited responses include `Retry-After` and, where applicable, `RateLimit-Limit`, `RateLimit-Remaining`, and `RateLimit-Reset`.

## 2. Authentication and scopes

Send the API key from your server, never from browser or mobile client code:

```http
Authorization: Bearer $CUSH_VERIFY_API_KEY
Content-Type: application/json
```

Create and revoke keys in the institutional workspace under **API & Integrations**. A key is shown once at creation or rotation; store it in a server-side secret manager. Sandbox and production keys are separate.

| Scope | Use |
| --- | --- |
| `passport:discover` | Minimal Passport discovery |
| `reports:request` | Create an individual consent request |
| `reports:read` | Read request state and retrieve authorized reports |
| `usage:read` | Read production usage and credit accounting |
| `webhooks:manage` | Manage signed production webhook destinations |
| `sandbox:simulate` | Run synthetic-only sandbox checks |

Grant each integration only the scopes it needs. A valid key does not override institution approval, consent, requested category limits, access expiry, subscription eligibility, or report-credit checks.

## 3. Consent-led report flow

1. Optionally discover a Passport with `POST /verify/passport-discovery`. Use an approved identifier (`email` or a request `reference_code`). Discovery is free and returns a masked label only; it does not return financial data.
2. Create a consent request with `POST /verify/report-requests`, supplying the recipient email, a specific purpose, requested categories, and authorization period (1–90 days). The recipient receives a secure link. Creating a request is free.
3. Poll `GET /verify/report-requests/{requestId}` for status. Protected report data remains unavailable until the individual explicitly approves the request.
4. Once authorized, call `POST /verify/report-requests/{requestId}/deliver`. The server checks the current consent, category subset, institution ownership, and expiry again before returning the report.
5. Review request history with `GET /verify/report-requests`, report history with `GET /reports`, and retrieve an accessible report with `GET /reports/{reportId}`.

Supported categories:

- `income_employment`
- `rent_housing`
- `savings`
- `financial_commitments`
- `score_summary`
- `assessment_status`
- `evidence_summary`

Example request:

```bash
curl --request POST \
  --url "https://verify.we-cush.com/api/v1/verify/report-requests" \
  --header "Authorization: Bearer $CUSH_VERIFY_API_KEY" \
  --header "Content-Type: application/json" \
  --data '{
    "recipientEmail": "person@example.com",
    "purpose": "Assess this rental application with the applicant’s consent",
    "categories": ["rent_housing", "score_summary"],
    "authorizationDays": 30
  }'
```

The response contains a `requestId`, `invitationEmailStatus`, and a secure `invitationUrl`. Treat that URL as a bearer capability: do not place it in public logs, analytics, or client-visible pages. If delivery of the invitation email fails, share the returned link only with the intended recipient through a secure channel.

Example report retrieval after consent is approved:

```bash
curl --request POST \
  --url "https://verify.we-cush.com/api/v1/verify/report-requests/$REQUEST_ID/deliver" \
  --header "Authorization: Bearer $CUSH_VERIFY_API_KEY"
```

## 4. Credits, retries, and request safety

- Discovery, unsuccessful search, invitations, consent requests, declined or expired consent, and consent approval without report retrieval are free.
- A successfully returned authorized report consumes one report credit.
- Failed report generation and failed API requests do not consume report credits.
- Dashboard and API retrieval use the same institutional report allocation.
- Repeating retrieval of the same unchanged report does not deduct an additional credit. A materially updated report may be a new billable delivery.
- Sandbox requests are synthetic and use zero credits.
- The create-request endpoint does not accept a client idempotency key. Do not blindly retry it after an ambiguous network failure; first check the request history and contact the intended user only once.

For transient `429` or `5xx` responses, wait for `Retry-After` if present and retry with bounded backoff. Do not retry authorization, validation, or consent errors without resolving their cause. A retry of report retrieval is safe for credit accounting, but a request-creation retry can create a second consent request.

## 5. Versioned usage

- `GET /usage` returns production API request totals, reports consumed, and current report-credit information.
- `GET /usage/breakdown` groups usage by day, endpoint, and API key.
- `GET /sandbox/usage` reports synthetic sandbox usage; it does not consume report credits.

Usage query filters support `from`, `to`, `limit` (1–100), and `offset` (0–10,000). Production usage also accepts `apiKeyId`; an optional endpoint filter accepts a versioned endpoint. Date ranges are limited to 90 days. Do not interpret API-call counts as billable report counts: only successfully returned authorized reports are billable.

## 6. Webhook destinations

Create and manage signed production destinations with the `webhooks:manage` scope. A destination must use HTTPS on the public internet. Redirects, URL credentials, query strings, private or reserved network addresses, and non-public DNS targets are rejected. Signing secrets are encrypted at rest and returned only once on creation or rotation.

Webhook event payloads contain operational references and status only; they do not include financial report contents. Event types are:

- `report.requested`
- `request.linked`
- `consent.approved`
- `consent.declined`
- `consent.revoked`
- `report.delivered`
- `report.accessed`
- `usage.threshold_reached`

Each delivery includes these headers:

- `X-Cush-Verify-Event-Id`
- `X-Cush-Verify-Event-Type`
- `X-Cush-Verify-Timestamp` — Unix seconds
- `X-Cush-Verify-Signature` — `v1=<hex HMAC-SHA256>`

The signature is HMAC-SHA256 using the destination signing secret over the exact UTF-8 bytes of `${timestamp}.${rawBody}`. Verify the signature against the raw request body before parsing JSON. Allow a small timestamp window (for example, five minutes) and deduplicate successfully handled events by event ID.

Example Express receiver (register this route before any JSON body parser consumes the body):

```js
import express from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

const app = express();
const signingSecret = process.env.CUSH_VERIFY_WEBHOOK_SECRET;

app.post("/webhooks/cush-verify", express.raw({ type: "application/json" }), async (req, res) => {
  const timestamp = req.header("X-Cush-Verify-Timestamp") || "";
  const signature = req.header("X-Cush-Verify-Signature") || "";
  const eventId = req.header("X-Cush-Verify-Event-Id") || "";
  const seconds = Number(timestamp);
  if (!signingSecret || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - seconds) > 300) {
    return res.sendStatus(401);
  }

  const expected = `v1=${createHmac("sha256", signingSecret)
    .update(`${timestamp}.${req.body.toString("utf8")}`, "utf8")
    .digest("hex")}`;
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(signature);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes)) {
    return res.sendStatus(401);
  }

  const event = JSON.parse(req.body.toString("utf8"));
  if (event.id !== eventId) return res.sendStatus(400);
  // Persist the event ID and apply your update transactionally.
  // Acknowledge only after the event has been stored safely.
  return res.sendStatus(204);
});
```

Return any `2xx` response after safely recording the event. Redirects are not followed. Cush Verify retries timeouts, HTTP 408, HTTP 429, and HTTP 5xx responses with bounded backoff, up to eight attempts. Other non-2xx responses are not retried. If all attempts fail, the workspace retains delivery history, shows a persistent alert to organisation administrators, and attempts an email notification when the sender is configured.

## 7. Sandbox

Use a sandbox key with `sandbox:simulate` for:

- `GET /sandbox/status`
- `POST /sandbox/discovery` with `{"scenario":"match"}` or `{"scenario":"no_match"}`
- `POST /sandbox/report-workflow` with `authorized`, `declined`, `expired`, `failed_report`, `unauthorized`, or `rate_limited`
- `GET /sandbox/usage`

Sandbox never accesses Passport data, sends a real consent email, creates production requests, or changes report credits. It is a functional simulation, not a production-data validation.

## 8. Error handling and support

Errors use JSON with an `error` string and an optional stable `code`. Common statuses are `400` invalid input, `401` invalid credentials, `403` insufficient scope/consent/access, `404` inaccessible or missing resource, `410` expired authorization, `429` rate limit, `402` or `503` billing availability, and `503` temporary service/data unavailability.

Do not log bearer keys, webhook secrets, full consent links, raw email addresses, report bodies, or financial data. For support, provide the `X-Request-Id`, endpoint, response status, and timestamp—never credentials or report content.
