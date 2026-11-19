import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, randomUUID } from "node:crypto";
import { lookup as dnsLookup } from "node:dns/promises";
import { BlockList, isIP, type LookupFunction } from "node:net";
import https from "node:https";
import { and, eq, lte, or, isNull, lt, asc } from "drizzle-orm";
import {
  cushVerifyWebhookAuditEvents,
  cushVerifyWebhookDeliveryAttempts,
  cushVerifyWebhookDeliveries,
  cushVerifyWebhookDestinations,
  cushVerifyWebhookEvents,
  type CushVerifyApiEnvironment,
} from "@shared/schema";
import { cushVerifyDb as db } from "./db";

export const CUSH_VERIFY_WEBHOOK_EVENT_TYPES = [
  "report.requested",
  "request.linked",
  "consent.approved",
  "consent.declined",
  "consent.revoked",
  "report.delivered",
  "report.accessed",
  "usage.threshold_reached",
] as const;
export type CushVerifyWebhookEventType = typeof CUSH_VERIFY_WEBHOOK_EVENT_TYPES[number];

const MAX_ATTEMPTS = 8;
const MAX_REQUEST_BYTES = 8192;
const DELIVERY_TIMEOUT_MS = 8_000;
const MAX_RESPONSE_BYTES = 4096;
const WORKER_INTERVAL_MS = 15_000;
const RETRY_DELAYS_MS = [30_000, 2 * 60_000, 10 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 6 * 60 * 60_000, 12 * 60 * 60_000];

const blockedAddresses = new BlockList();
[
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24],
  ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16],
  ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
].forEach(([address, prefix]) => blockedAddresses.addSubnet(String(address), Number(prefix), "ipv4"));
[
  ["::", 128], ["::1", 128], ["64:ff9b:1::", 48],
  ["100::", 64], ["2001::", 23], ["2001:db8::", 32], ["2002::", 16],
  ["fc00::", 7], ["fe80::", 10], ["ff00::", 8],
].forEach(([address, prefix]) => blockedAddresses.addSubnet(String(address), Number(prefix), "ipv6"));

export class CushVerifyWebhookError extends Error {
  constructor(public readonly code: string, message = code) {
    super(message);
    this.name = "CushVerifyWebhookError";
  }
}

export function isPublicWebhookAddress(address: string): boolean {
  const family = isIP(address);
  if (!family) return false;
  if (
    family === 6 &&
    (/^::ffff:/i.test(address) || /^0:0:0:0:0:ffff:/i.test(address))
  ) return false;
  return !blockedAddresses.check(address, family === 4 ? "ipv4" : "ipv6");
}

function normalizeHostname(hostname: string): string {
  return hostname.replace(/^\[|\]$/g, "").toLowerCase().replace(/\.$/, "");
}

async function lookupPublicAddresses(hostname: string) {
  const host = normalizeHostname(hostname);
  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".test") ||
    host.endsWith(".invalid") ||
    host.endsWith(".example")
  ) throw new CushVerifyWebhookError("destination_host_not_public");

  const literalFamily = isIP(host);
  const addresses: Array<{ address: string; family: number }> = literalFamily
    ? [{ address: host, family: literalFamily }]
    : await new Promise<Array<{ address: string; family: number }>>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new CushVerifyWebhookError("destination_dns_timeout")), 4_000);
        dnsLookup(host, { all: true, verbatim: true }).then(
          (resolved: Array<{ address: string; family: number }>) => {
            clearTimeout(timeout);
            resolve(resolved);
          },
          (error) => {
            clearTimeout(timeout);
            reject(error);
          },
        );
      });
  if (!addresses.length || addresses.some((entry) => !isPublicWebhookAddress(entry.address))) {
    throw new CushVerifyWebhookError("destination_host_not_public");
  }
  return addresses;
}

type WebhookAddress = { address: string; family: number };
type WebhookAddressResolver = (hostname: string) => Promise<WebhookAddress[]>;

export async function validateCushVerifyWebhookUrl(
  value: string,
  resolver: WebhookAddressResolver = lookupPublicAddresses,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CushVerifyWebhookError("destination_url_invalid");
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.port !== "" && url.port !== "443") ||
    url.href.length > 2048
  ) throw new CushVerifyWebhookError("destination_url_unsafe");
  const hostname = normalizeHostname(url.hostname);
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".test") ||
    hostname.endsWith(".invalid") ||
    hostname.endsWith(".example")
  ) throw new CushVerifyWebhookError("destination_host_not_public");
  const addresses = await resolver(url.hostname);
  if (!addresses.length || addresses.some((entry) => !isPublicWebhookAddress(entry.address))) {
    throw new CushVerifyWebhookError("destination_host_not_public");
  }
  return url;
}

function encryptionKey(): Buffer {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    throw new CushVerifyWebhookError("webhook_encryption_unavailable");
  }
  return Buffer.from(hkdfSync(
    "sha256",
    Buffer.from(sessionSecret, "utf8"),
    Buffer.from("cush-verify-webhooks", "utf8"),
    Buffer.from("destination-secret-encryption-v1", "utf8"),
    32,
  ));
}

export function encryptCushVerifyWebhookSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return {
    secretCiphertext: ciphertext.toString("base64url"),
    secretIv: iv.toString("base64url"),
    secretTag: cipher.getAuthTag().toString("base64url"),
  };
}

export function decryptCushVerifyWebhookSecret(input: {
  secretCiphertext: string;
  secretIv: string;
  secretTag: string;
}): string {
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      Buffer.from(input.secretIv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(input.secretTag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(input.secretCiphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw new CushVerifyWebhookError("webhook_secret_unavailable");
  }
}

export function buildCushVerifyWebhookSignature(secret: string, timestamp: string, rawBody: string): string {
  return `v1=${createHmac("sha256", Buffer.from(secret, "utf8"))
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex")}`;
}

export function getCushVerifyWebhookRetryAt(attemptNumber: number, now = Date.now()): Date | null {
  if (attemptNumber >= MAX_ATTEMPTS) return null;
  const delay = RETRY_DELAYS_MS[Math.min(attemptNumber - 1, RETRY_DELAYS_MS.length - 1)] ?? 12 * 60 * 60_000;
  return new Date(now + delay);
}

export function classifyCushVerifyWebhookResponse(statusCode: number) {
  if (statusCode >= 200 && statusCode < 300) {
    return { success: true, retryable: false, errorCode: null };
  }
  if (statusCode >= 300 && statusCode < 400) {
    return { success: false, retryable: false, errorCode: "redirect_not_allowed" };
  }
  const retryable = statusCode === 408 || statusCode === 429 || statusCode >= 500;
  return {
    success: false,
    retryable,
    errorCode: `http_${statusCode}`,
  };
}

type WebhookTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function enqueueCushVerifyWebhookEvent(
  tx: WebhookTransaction,
  input: {
    institutionId: number;
    environment?: CushVerifyApiEnvironment;
    eventType: CushVerifyWebhookEventType;
    idempotencyKey: string;
    data: Record<string, unknown>;
    createdAt?: Date;
  },
): Promise<void> {
  const environment = input.environment ?? "production";
  const eventId = randomUUID();
  const createdAt = input.createdAt ?? new Date();
  const payload = {
    id: eventId,
    type: input.eventType,
    createdAt: createdAt.toISOString(),
    data: input.data,
  };
  const [inserted] = await tx.insert(cushVerifyWebhookEvents).values({
    id: eventId,
    institutionId: input.institutionId,
    environment,
    eventType: input.eventType,
    idempotencyKey: input.idempotencyKey,
    payload,
    createdAt,
  }).onConflictDoNothing().returning({ id: cushVerifyWebhookEvents.id });
  const [event] = inserted
    ? [inserted]
    : await tx.select({ id: cushVerifyWebhookEvents.id })
        .from(cushVerifyWebhookEvents)
        .where(and(
          eq(cushVerifyWebhookEvents.institutionId, input.institutionId),
          eq(cushVerifyWebhookEvents.environment, environment),
          eq(cushVerifyWebhookEvents.idempotencyKey, input.idempotencyKey),
        ))
        .limit(1);
  if (!event) return;

  const destinations = await tx.select({
    id: cushVerifyWebhookDestinations.id,
    eventTypes: cushVerifyWebhookDestinations.eventTypes,
    usageThresholdPercentages: cushVerifyWebhookDestinations.usageThresholdPercentages,
  })
    .from(cushVerifyWebhookDestinations)
    .where(and(
      eq(cushVerifyWebhookDestinations.institutionId, input.institutionId),
      eq(cushVerifyWebhookDestinations.environment, environment),
      eq(cushVerifyWebhookDestinations.status, "active"),
    ));
  const threshold = Number(input.data.thresholdPercentage);
  for (const destination of destinations) {
    if (!destination.eventTypes.includes(input.eventType)) continue;
    if (
      input.eventType === "usage.threshold_reached" &&
      !destination.usageThresholdPercentages.includes(threshold)
    ) continue;
    await tx.insert(cushVerifyWebhookDeliveries).values({
      eventId: event.id,
      destinationId: destination.id,
      institutionId: input.institutionId,
      status: "pending",
      createdAt,
      updatedAt: createdAt,
    }).onConflictDoNothing();
  }
}

export async function addCushVerifyWebhookAuditEvent(input: {
  institutionId: number;
  destinationId: number | null;
  actorInstitutionalUserId: number;
  eventType: "created" | "updated" | "disabled" | "deleted" | "secret_rotated";
  details?: Record<string, unknown>;
}) {
  await db.insert(cushVerifyWebhookAuditEvents).values({
    ...input,
    details: input.details ?? {},
  });
}

function requestPinnedWebhook(
  url: URL,
  addresses: Awaited<ReturnType<typeof lookupPublicAddresses>>,
  rawBody: string,
  secret: string,
  event: { id: string; eventType: string },
): Promise<{ statusCode: number; errorCode: string | null; retryable: boolean }> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: { statusCode: number; errorCode: string | null; retryable: boolean }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const hostname = normalizeHostname(url.hostname);
    const lookup: LookupFunction = (requestedHostname, options, callback) => {
      if (normalizeHostname(requestedHostname) !== hostname) {
        callback(new CushVerifyWebhookError("destination_lookup_mismatch"), "", 0);
        return;
      }
      if (options && typeof options === "object" && "all" in options && options.all) {
        callback(null, addresses);
      } else {
        const address = addresses[0]!;
        callback(null, address.address, address.family);
      }
    };
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = buildCushVerifyWebhookSignature(secret, timestamp, rawBody);
    const request = https.request(url, {
      method: "POST",
      agent: false,
      lookup,
      rejectUnauthorized: true,
      servername: isIP(hostname) ? undefined : hostname,
      timeout: DELIVERY_TIMEOUT_MS,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(rawBody),
        "User-Agent": "CushVerify-Webhooks/1.0",
        "X-Cush-Verify-Event-Id": event.id,
        "X-Cush-Verify-Event-Type": event.eventType,
        "X-Cush-Verify-Timestamp": timestamp,
        "X-Cush-Verify-Signature": signature,
      },
    }, (response) => {
      const statusCode = response.statusCode ?? 0;
      const contentLength = Number(response.headers["content-length"] ?? 0);
      if (contentLength > MAX_RESPONSE_BYTES) {
        response.destroy();
        finish({ statusCode, errorCode: "response_too_large", retryable: false });
        return;
      }
      let responseBytes = 0;
      response.on("data", (chunk: Buffer | string) => {
        responseBytes += Buffer.byteLength(chunk);
        if (responseBytes > MAX_RESPONSE_BYTES) {
          response.destroy();
          finish({ statusCode, errorCode: "response_too_large", retryable: false });
        }
      });
      response.once("end", () => {
        const classification = classifyCushVerifyWebhookResponse(statusCode);
        finish({
          statusCode,
          errorCode: classification.errorCode,
          retryable: classification.retryable,
        });
      });
      response.once("aborted", () => finish({ statusCode, errorCode: "response_incomplete", retryable: true }));
    });
    request.once("timeout", () => request.destroy(new CushVerifyWebhookError("delivery_timeout")));
    request.once("error", (error) => {
      const candidate = error instanceof CushVerifyWebhookError
        ? error.code
        : "delivery_network_error";
      finish({
        statusCode: 0,
        errorCode: /^[a-z0-9_]{1,60}$/.test(candidate) ? candidate : "delivery_network_error",
        retryable: candidate !== "destination_host_not_public" && candidate !== "destination_url_unsafe",
      });
    });
    request.end(rawBody);
  });
}

async function deliverOne(input: {
  deliveryId: number;
  attemptNumber: number;
  destination: typeof cushVerifyWebhookDestinations.$inferSelect;
  event: typeof cushVerifyWebhookEvents.$inferSelect;
}) {
  const startedAt = Date.now();
  let result: { statusCode: number; errorCode: string | null; retryable: boolean };
  try {
    const url = await validateCushVerifyWebhookUrl(input.destination.url);
    const addresses = await lookupPublicAddresses(url.hostname);
    const secret = decryptCushVerifyWebhookSecret(input.destination);
    const rawBody = JSON.stringify(input.event.payload);
    if (Buffer.byteLength(rawBody) > MAX_REQUEST_BYTES) {
      throw new CushVerifyWebhookError("event_payload_too_large");
    }
    result = await requestPinnedWebhook(url, addresses, rawBody, secret, {
      id: input.event.id,
      eventType: input.event.eventType,
    });
  } catch (error) {
    const code = error instanceof CushVerifyWebhookError
      ? error.code
      : "delivery_failed";
    result = {
      statusCode: 0,
      errorCode: /^[a-z0-9_]{1,60}$/.test(code) ? code : "delivery_failed",
      retryable: ![
        "destination_host_not_public",
        "destination_url_unsafe",
        "destination_url_invalid",
        "event_payload_too_large",
        "webhook_secret_unavailable",
        "webhook_encryption_unavailable",
      ].includes(code),
    };
  }

  const completedAt = new Date();
  const nextAttemptAt = result.retryable
    ? getCushVerifyWebhookRetryAt(input.attemptNumber, completedAt.getTime())
    : null;
  const outcome = result.statusCode > 0 && result.statusCode < 300
    ? "delivered"
    : nextAttemptAt
      ? "retrying"
      : "failed";
  await db.transaction(async (tx) => {
    await tx.update(cushVerifyWebhookDeliveryAttempts).set({
      outcome,
      responseStatus: result.statusCode || null,
      errorCode: result.errorCode,
      durationMs: Math.max(0, completedAt.getTime() - startedAt),
      completedAt,
    }).where(and(
      eq(cushVerifyWebhookDeliveryAttempts.deliveryId, input.deliveryId),
      eq(cushVerifyWebhookDeliveryAttempts.attemptNumber, input.attemptNumber),
    ));
    await tx.update(cushVerifyWebhookDeliveries).set({
      status: outcome === "delivered" ? "delivered" : nextAttemptAt ? "pending" : "failed",
      nextAttemptAt: nextAttemptAt ?? completedAt,
      lockedUntil: null,
      lastStatusCode: result.statusCode || null,
      lastErrorCode: result.errorCode,
      deliveredAt: outcome === "delivered" ? completedAt : null,
      updatedAt: completedAt,
    }).where(eq(cushVerifyWebhookDeliveries.id, input.deliveryId));
  });
}

export async function processPendingCushVerifyWebhookDeliveries(limit = 10): Promise<number> {
  const now = new Date();
  const claimed = await db.transaction(async (tx) => {
    const rows = await tx.select({
      delivery: cushVerifyWebhookDeliveries,
      destination: cushVerifyWebhookDestinations,
      event: cushVerifyWebhookEvents,
    })
      .from(cushVerifyWebhookDeliveries)
      .innerJoin(cushVerifyWebhookDestinations, eq(
        cushVerifyWebhookDestinations.id,
        cushVerifyWebhookDeliveries.destinationId,
      ))
      .innerJoin(cushVerifyWebhookEvents, eq(
        cushVerifyWebhookEvents.id,
        cushVerifyWebhookDeliveries.eventId,
      ))
      .where(and(
        eq(cushVerifyWebhookDestinations.status, "active"),
        lte(cushVerifyWebhookDeliveries.nextAttemptAt, now),
        or(
          eq(cushVerifyWebhookDeliveries.status, "pending"),
          and(
            eq(cushVerifyWebhookDeliveries.status, "processing"),
            or(
              isNull(cushVerifyWebhookDeliveries.lockedUntil),
              lt(cushVerifyWebhookDeliveries.lockedUntil, now),
            ),
          ),
        ),
      ))
      .orderBy(asc(cushVerifyWebhookDeliveries.nextAttemptAt))
      .limit(Math.max(1, Math.min(limit, 50)))
      .for("update", { skipLocked: true });
    for (const row of rows) {
      const attemptNumber = row.delivery.attemptCount + 1;
      await tx.update(cushVerifyWebhookDeliveries).set({
        status: "processing",
        attemptCount: attemptNumber,
        lockedUntil: new Date(now.getTime() + DELIVERY_TIMEOUT_MS + 10_000),
        updatedAt: now,
      }).where(eq(cushVerifyWebhookDeliveries.id, row.delivery.id));
      await tx.insert(cushVerifyWebhookDeliveryAttempts).values({
        deliveryId: row.delivery.id,
        attemptNumber,
        outcome: "processing",
        startedAt: now,
      }).onConflictDoNothing();
    }
    return rows;
  });
  for (const row of claimed) {
    await deliverOne({
      deliveryId: row.delivery.id,
      attemptNumber: row.delivery.attemptCount + 1,
      destination: row.destination,
      event: row.event,
    });
  }
  return claimed.length;
}

let webhookWorkerStarted = false;
export function startCushVerifyWebhookWorkers(): void {
  if (webhookWorkerStarted) return;
  webhookWorkerStarted = true;
  const run = () => {
    void processPendingCushVerifyWebhookDeliveries().catch((error) => {
      console.error("Cush Verify webhook delivery worker failed", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    });
  };
  run();
  const timer = setInterval(run, WORKER_INTERVAL_MS);
  timer.unref();
}
