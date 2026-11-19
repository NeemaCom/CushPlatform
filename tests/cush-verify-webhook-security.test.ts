import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  buildCushVerifyWebhookSignature,
  classifyCushVerifyWebhookResponse,
  createCushVerifyPinnedWebhookLookup,
  decryptCushVerifyWebhookSecret,
  encryptCushVerifyWebhookSecret,
  getCushVerifyWebhookRetryAt,
  isPublicWebhookAddress,
  validateCushVerifyWebhookUrl,
  enqueueCushVerifyWebhookEvent,
} from "../server/cush-verify-webhooks";
import {
  cushVerifyWebhookDestinations,
  cushVerifyWebhookEvents,
} from "@shared/schema";

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

  it("pins the actual socket lookup to the already-checked public DNS answer", () => {
    const lookup = createCushVerifyPinnedWebhookLookup("hooks.example.org", [
      { address: "93.184.216.34", family: 4 },
    ]);
    let resolvedAddress = "";
    lookup("hooks.example.org", {}, (error, address) => {
      expect(error).toBeNull();
      resolvedAddress = String(address);
    });
    expect(resolvedAddress).toBe("93.184.216.34");
    let mismatch: Error | null = null;
    lookup("internal.service", {}, (error) => {
      mismatch = error;
    });
    expect(mismatch).toMatchObject({ code: "destination_lookup_mismatch" });
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

  it("creates one stable event and delivery for repeated idempotency keys", async () => {
    const events: Array<Record<string, unknown>> = [];
    const deliveries: Array<Record<string, unknown>> = [];
    const destinations: Array<{
      id: number;
      eventTypes: string[];
      usageThresholdPercentages: number[];
    }> = [{
      id: 41,
      eventTypes: ["consent.approved"],
      usageThresholdPercentages: [],
    }];
    const tx = {
      insert(table: unknown) {
        return {
          values(value: Record<string, unknown>) {
            if (table === cushVerifyWebhookEvents) {
              return {
                onConflictDoNothing() {
                  return {
                    async returning() {
                      const duplicate = events.find((event) =>
                        event.institutionId === value.institutionId &&
                        event.environment === value.environment &&
                        event.idempotencyKey === value.idempotencyKey,
                      );
                      if (duplicate) return [];
                      events.push(value);
                      return [{ id: value.id }];
                    },
                  };
                },
              };
            }
            if (table === cushVerifyWebhookDestinations) {
              throw new Error("Unexpected insert into destinations.");
            }
            return {
              onConflictDoNothing() {
                const duplicate = deliveries.some((delivery) =>
                  delivery.eventId === value.eventId &&
                  delivery.destinationId === value.destinationId,
                );
                if (!duplicate) deliveries.push(value);
                return Promise.resolve();
              },
            };
          },
        };
      },
      select() {
        let selectedTable: unknown;
        const query: {
          from(table: unknown): typeof query;
          where(): typeof query;
          limit(): Promise<Array<Record<string, unknown>>>;
          then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown): Promise<unknown>;
        } = {
          from(table) {
            selectedTable = table;
            return query;
          },
          where() {
            return query;
          },
          async limit() {
            return events.filter((event) => selectedTable === cushVerifyWebhookEvents);
          },
          then(resolve, reject) {
            const rows = selectedTable === cushVerifyWebhookDestinations ? destinations : [];
            return Promise.resolve(rows).then(resolve, reject);
          },
        };
        return query;
      },
    };
    const input = {
      institutionId: 12,
      eventType: "consent.approved" as const,
      idempotencyKey: "consent-decision:request-1:approved",
      data: { requestId: "request-1", status: "authorized" },
      createdAt: new Date("2026-11-19T12:00:00.000Z"),
    };

    await enqueueCushVerifyWebhookEvent(tx as never, input);
    const firstEventId = events[0]?.id;
    await enqueueCushVerifyWebhookEvent(tx as never, input);

    expect(events).toHaveLength(1);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]?.eventId).toBe(firstEventId);
    expect(deliveries[0]?.destinationId).toBe(41);

    destinations.push({
      id: 42,
      eventTypes: ["usage.threshold_reached"],
      usageThresholdPercentages: [50],
    });
    await enqueueCushVerifyWebhookEvent(tx as never, {
      institutionId: 12,
      eventType: "usage.threshold_reached",
      idempotencyKey: "usage-threshold:production:period:50",
      data: { thresholdPercentage: 50, reportsUsed: 5, reportLimit: 10 },
    });
    await enqueueCushVerifyWebhookEvent(tx as never, {
      institutionId: 12,
      eventType: "usage.threshold_reached",
      idempotencyKey: "usage-threshold:production:period:75",
      data: { thresholdPercentage: 75, reportsUsed: 8, reportLimit: 10 },
    });
    expect(events).toHaveLength(2);
    expect(deliveries).toHaveLength(2);
    expect(deliveries[1]?.destinationId).toBe(42);
  });
});
