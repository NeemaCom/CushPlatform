import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildCushVerifyWebhookSignature,
  classifyCushVerifyWebhookResponse,
  decryptCushVerifyWebhookSecret,
  encryptCushVerifyWebhookSecret,
  getCushVerifyWebhookRetryAt,
  isPublicWebhookAddress,
  validateCushVerifyWebhookUrl,
} from "../server/cush-verify-webhooks";

describe("Cush Verify webhook endpoint safety", () => {
  const originalSessionSecret = process.env.SESSION_SECRET;

  beforeAll(() => {
    process.env.SESSION_SECRET = "webhook-test-session-secret-32-characters-minimum";
  });

  afterAll(() => {
    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSessionSecret;
  });

  it.each([
    "0.0.0.0",
    "10.0.0.7",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.169.254",
    "172.20.1.1",
    "192.168.1.1",
    "198.18.0.1",
    "224.0.0.1",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])("blocks non-public address %s", (address) => {
    expect(isPublicWebhookAddress(address)).toBe(false);
  });

  it("accepts an HTTPS host only when every DNS answer is public", async () => {
    const publicDns = async () => [{ address: "93.184.216.34", family: 4 }];
    await expect(validateCushVerifyWebhookUrl("https://hooks.example.org/events", publicDns))
      .resolves.toMatchObject({ protocol: "https:", hostname: "hooks.example.org" });
    const mixedDns = async () => [
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.4", family: 4 },
    ];
    await expect(validateCushVerifyWebhookUrl("https://hooks.example.org/events", mixedDns))
      .rejects.toMatchObject({ code: "destination_host_not_public" });
  });

  it("rechecks DNS so a destination that changes to an internal address is rejected", async () => {
    const answers = [
      [{ address: "93.184.216.34", family: 4 }],
      [{ address: "127.0.0.1", family: 4 }],
    ];
    let attempt = 0;
    const changingDns = async () => answers[attempt++] ?? answers.at(-1)!;
    await expect(validateCushVerifyWebhookUrl("https://hooks.example.org/events", changingDns)).resolves.toBeDefined();
    await expect(validateCushVerifyWebhookUrl("https://hooks.example.org/events", changingDns))
      .rejects.toMatchObject({ code: "destination_host_not_public" });
  });

  it.each([
    "http://hooks.example.org/events",
    "https://user:password@hooks.example.org/events",
    "https://hooks.example.org/events?token=secret",
    "https://hooks.example.org/events#fragment",
    "https://hooks.example.org:8443/events",
    "https://localhost/events",
    "https://service.internal/events",
  ])("rejects unsafe webhook URL %s", async (url) => {
    const publicDns = async () => [{ address: "93.184.216.34", family: 4 }];
    await expect(validateCushVerifyWebhookUrl(url, publicDns)).rejects.toBeInstanceOf(Error);
  });

  it("creates a verifiable timestamped HMAC signature and encrypts the secret at rest", () => {
    const secret = "one-time-secret-value";
    const timestamp = "1795000000";
    const rawBody = JSON.stringify({ id: "event-1", type: "consent.approved" });
    const expected = `v1=${createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex")}`;
    const encrypted = encryptCushVerifyWebhookSecret(secret);
    expect(buildCushVerifyWebhookSignature(secret, timestamp, rawBody)).toBe(expected);
    expect(encrypted.secretCiphertext).not.toContain(secret);
    expect(decryptCushVerifyWebhookSecret(encrypted)).toBe(secret);
  });

  it("never follows redirects and retries only transient delivery failures", () => {
    expect(classifyCushVerifyWebhookResponse(204)).toMatchObject({ success: true, retryable: false });
    expect(classifyCushVerifyWebhookResponse(302)).toMatchObject({
      success: false,
      retryable: false,
      errorCode: "redirect_not_allowed",
    });
    expect(classifyCushVerifyWebhookResponse(429).retryable).toBe(true);
    expect(classifyCushVerifyWebhookResponse(503).retryable).toBe(true);
    expect(classifyCushVerifyWebhookResponse(401).retryable).toBe(false);
  });

  it("uses bounded retry delays and stops after the eighth attempt", () => {
    const now = Date.parse("2026-11-19T12:00:00Z");
    expect(getCushVerifyWebhookRetryAt(1, now)?.getTime()).toBe(now + 30_000);
    expect(getCushVerifyWebhookRetryAt(7, now)?.getTime()).toBe(now + 12 * 60 * 60_000);
    expect(getCushVerifyWebhookRetryAt(8, now)).toBeNull();
  });
});
