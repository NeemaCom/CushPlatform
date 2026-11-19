import type { Express } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  cushVerifyWebhookAuditEvents,
  cushVerifyWebhookDeliveryAttempts,
  cushVerifyWebhookDeliveries,
  cushVerifyWebhookDestinations,
  cushVerifyWebhookEvents,
} from "@shared/schema";
import { cushVerifyDb as db } from "./db";
import {
  getInstitutionalWorkspaceState,
  requireApprovedInstitution,
  type InstitutionalRequest,
} from "./cush-verify-institutional-routes";
import { requireCushVerifyApiScope } from "./cush-verify-api-key-service";
import {
  CUSH_VERIFY_WEBHOOK_EVENT_TYPES,
  CushVerifyWebhookError,
  encryptCushVerifyWebhookSecret,
  validateCushVerifyWebhookUrl,
} from "./cush-verify-webhooks";
import { randomBytes } from "node:crypto";

const usageThresholdOptions = [5, 10, 20, 25, 50, 75, 80, 90, 95, 100] as const;

const webhookDestinationInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  url: z.string().trim().min(1).max(2048),
  eventTypes: z.array(z.enum(CUSH_VERIFY_WEBHOOK_EVENT_TYPES)).min(1).max(8),
  usageThresholdPercentages: z.array(z.number().int().refine((value) =>
    usageThresholdOptions.includes(value as typeof usageThresholdOptions[number]),
  )).max(10).default([]),
}).strict().superRefine((input, context) => {
  if (new Set(input.eventTypes).size !== input.eventTypes.length) {
    context.addIssue({ code: "custom", path: ["eventTypes"], message: "Duplicate event types are not allowed." });
  }
  if (new Set(input.usageThresholdPercentages).size !== input.usageThresholdPercentages.length) {
    context.addIssue({ code: "custom", path: ["usageThresholdPercentages"], message: "Duplicate usage thresholds are not allowed." });
  }
  if (
    input.eventTypes.includes("usage.threshold_reached") !==
    (input.usageThresholdPercentages.length > 0)
  ) {
    context.addIssue({
      code: "custom",
      path: ["usageThresholdPercentages"],
      message: "Choose one or more usage thresholds only when subscribing to usage threshold events.",
    });
  }
});

const updateWebhookDestinationSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  url: z.string().trim().min(1).max(2048).optional(),
  eventTypes: z.array(z.enum(CUSH_VERIFY_WEBHOOK_EVENT_TYPES)).min(1).max(8).optional(),
  usageThresholdPercentages: z.array(z.number().int().refine((value) =>
    usageThresholdOptions.includes(value as typeof usageThresholdOptions[number]),
  )).max(10).optional(),
  status: z.enum(["active", "disabled"]).optional(),
}).strict().superRefine((input, context) => {
  if (!Object.keys(input).length) {
    context.addIssue({ code: "custom", message: "Make at least one change." });
  }
  if (input.eventTypes && new Set(input.eventTypes).size !== input.eventTypes.length) {
    context.addIssue({ code: "custom", path: ["eventTypes"], message: "Duplicate event types are not allowed." });
  }
  if (
    input.usageThresholdPercentages &&
    new Set(input.usageThresholdPercentages).size !== input.usageThresholdPercentages.length
  ) {
    context.addIssue({ code: "custom", path: ["usageThresholdPercentages"], message: "Duplicate usage thresholds are not allowed." });
  }
});

function safeDestinationView(destination: typeof cushVerifyWebhookDestinations.$inferSelect) {
  return {
    id: destination.id,
    name: destination.name,
    url: destination.url,
    environment: destination.environment,
    eventTypes: destination.eventTypes,
    usageThresholdPercentages: destination.usageThresholdPercentages,
    status: destination.status,
    createdAt: destination.createdAt.toISOString(),
    updatedAt: destination.updatedAt.toISOString(),
  };
}

async function getWebhookAdmin(req: InstitutionalRequest) {
  const userId = req.cushVerifyInstitutionalUserId ?? req.cushVerifyApiContext?.createdByInstitutionalUserId;
  if (!userId) return null;
  const membership = await getInstitutionalWorkspaceState(userId);
  if (
    !membership ||
    membership.membershipStatus !== "active" ||
    membership.institutionStatus !== "approved" ||
    membership.applicationStatus !== "approved" ||
    membership.role !== "organisation_admin"
  ) return null;
  return { userId, institutionId: membership.institutionId };
}

function invalidDestinationResponse(error: unknown) {
  return error instanceof CushVerifyWebhookError
    ? "Use an HTTPS destination on a publicly reachable host, without URL credentials or query parameters."
    : "The webhook destination could not be verified.";
}

export function registerCushVerifyWebhookRoutes(app: Express): void {
  const scope = requireCushVerifyApiScope("webhooks:manage");

  app.get(
    "/api/v1/webhooks",
    scope,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      try {
        const actor = await getWebhookAdmin(req);
        if (!actor) return res.status(403).json({ code: "ORGANISATION_ADMIN_REQUIRED", error: "Only an active organisation administrator can manage webhooks." });
        const destinations = await db.select().from(cushVerifyWebhookDestinations)
          .where(and(
            eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
            eq(cushVerifyWebhookDestinations.environment, "production"),
          ))
          .orderBy(desc(cushVerifyWebhookDestinations.createdAt))
          .limit(100);
        return res.json({ destinations: destinations.map(safeDestinationView) });
      } catch (error) {
        console.error("Cush Verify webhook destination list failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "Webhook management is temporarily unavailable." });
      }
    },
  );

  app.post(
    "/api/v1/webhooks",
    scope,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const parsed = webhookDestinationInputSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: "Check the name, HTTPS URL, event types, and usage thresholds." });
      try {
        const actor = await getWebhookAdmin(req);
        if (!actor) return res.status(403).json({ code: "ORGANISATION_ADMIN_REQUIRED", error: "Only an active organisation administrator can manage webhooks." });
        const validatedUrl = await validateCushVerifyWebhookUrl(parsed.data.url);
        const signingSecret = randomBytes(32).toString("base64url");
        const encrypted = encryptCushVerifyWebhookSecret(signingSecret);
        const [destination] = await db.transaction(async (tx) => {
          const [created] = await tx.insert(cushVerifyWebhookDestinations).values({
            institutionId: actor.institutionId,
            createdByInstitutionalUserId: actor.userId,
            name: parsed.data.name,
            url: validatedUrl.toString(),
            environment: "production",
            eventTypes: parsed.data.eventTypes,
            usageThresholdPercentages: parsed.data.usageThresholdPercentages,
            ...encrypted,
          }).returning();
          await tx.insert(cushVerifyWebhookAuditEvents).values({
            institutionId: actor.institutionId,
            destinationId: created.id,
            actorInstitutionalUserId: actor.userId,
            eventType: "created",
            details: { eventTypes: parsed.data.eventTypes },
          });
          return [created];
        });
        return res.status(201).json({
          destination: safeDestinationView(destination),
          signingSecret,
          secretNotice: "Copy the signing secret now. It will not be shown again.",
        });
      } catch (error) {
        console.error("Cush Verify webhook destination creation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return error instanceof CushVerifyWebhookError
          ? res.status(400).json({ error: invalidDestinationResponse(error) })
          : res.status(503).json({ error: "The webhook destination could not be created." });
      }
    },
  );

  app.patch(
    "/api/v1/webhooks/:id",
    scope,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const id = Number(req.params.id);
      const parsed = updateWebhookDestinationSchema.safeParse(req.body);
      if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
        return res.status(400).json({ error: "Choose a valid destination and at least one supported update." });
      }
      try {
        const actor = await getWebhookAdmin(req);
        if (!actor) return res.status(403).json({ code: "ORGANISATION_ADMIN_REQUIRED", error: "Only an active organisation administrator can manage webhooks." });
        const [current] = await db.select().from(cushVerifyWebhookDestinations).where(and(
          eq(cushVerifyWebhookDestinations.id, id),
          eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
          eq(cushVerifyWebhookDestinations.environment, "production"),
          eq(cushVerifyWebhookDestinations.status, "active"),
        )).limit(1);
        if (!current) return res.status(404).json({ error: "Webhook destination not found." });
        const nextEventTypes = parsed.data.eventTypes ?? current.eventTypes;
        const nextThresholds = parsed.data.usageThresholdPercentages ?? current.usageThresholdPercentages;
        if (
          nextEventTypes.includes("usage.threshold_reached") !==
          (nextThresholds.length > 0)
        ) return res.status(400).json({ error: "Usage thresholds must be configured only for usage threshold events." });
        const nextUrl = parsed.data.url ?? current.url;
        const validatedUrl = parsed.data.url
          ? await validateCushVerifyWebhookUrl(nextUrl)
          : null;
        const [updated] = await db.transaction(async (tx) => {
          const [row] = await tx.update(cushVerifyWebhookDestinations).set({
            ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
            ...(validatedUrl ? { url: validatedUrl.toString() } : {}),
            eventTypes: nextEventTypes,
            usageThresholdPercentages: nextThresholds,
            ...(parsed.data.status ? { status: parsed.data.status } : {}),
            updatedAt: new Date(),
          }).where(and(
            eq(cushVerifyWebhookDestinations.id, id),
            eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
            eq(cushVerifyWebhookDestinations.environment, "production"),
          )).returning();
          if (parsed.data.status === "disabled") {
            await tx.update(cushVerifyWebhookDeliveries).set({
              status: "cancelled",
              lockedUntil: null,
              updatedAt: new Date(),
            }).where(and(
              eq(cushVerifyWebhookDeliveries.destinationId, id),
              eq(cushVerifyWebhookDeliveries.institutionId, actor.institutionId),
              inArray(cushVerifyWebhookDeliveries.status, ["pending", "processing"]),
            ));
          }
          await tx.insert(cushVerifyWebhookAuditEvents).values({
            institutionId: actor.institutionId,
            destinationId: id,
            actorInstitutionalUserId: actor.userId,
            eventType: parsed.data.status === "disabled" ? "disabled" : "updated",
            details: {
              fields: Object.keys(parsed.data),
              ...(parsed.data.eventTypes ? { eventTypes: parsed.data.eventTypes } : {}),
            },
          });
          return [row];
        });
        return res.json({ destination: safeDestinationView(updated) });
      } catch (error) {
        console.error("Cush Verify webhook destination update failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return error instanceof CushVerifyWebhookError
          ? res.status(400).json({ error: invalidDestinationResponse(error) })
          : res.status(503).json({ error: "The webhook destination could not be updated." });
      }
    },
  );

  app.delete(
    "/api/v1/webhooks/:id",
    scope,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "The destination ID is invalid." });
      try {
        const actor = await getWebhookAdmin(req);
        if (!actor) return res.status(403).json({ code: "ORGANISATION_ADMIN_REQUIRED", error: "Only an active organisation administrator can manage webhooks." });
        const now = new Date();
        const removed = await db.transaction(async (tx) => {
          const [destination] = await tx.update(cushVerifyWebhookDestinations).set({
            status: "deleted",
            deletedAt: now,
            updatedAt: now,
          }).where(and(
            eq(cushVerifyWebhookDestinations.id, id),
            eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
            eq(cushVerifyWebhookDestinations.environment, "production"),
            inArray(cushVerifyWebhookDestinations.status, ["active", "disabled"]),
          )).returning({ id: cushVerifyWebhookDestinations.id });
          if (!destination) return false;
          await tx.update(cushVerifyWebhookDeliveries).set({
            status: "cancelled",
            lockedUntil: null,
            updatedAt: now,
          }).where(and(
            eq(cushVerifyWebhookDeliveries.destinationId, id),
            eq(cushVerifyWebhookDeliveries.institutionId, actor.institutionId),
            inArray(cushVerifyWebhookDeliveries.status, ["pending", "processing"]),
          ));
          await tx.insert(cushVerifyWebhookAuditEvents).values({
            institutionId: actor.institutionId,
            destinationId: id,
            actorInstitutionalUserId: actor.userId,
            eventType: "deleted",
            details: {},
          });
          return true;
        });
        return removed
          ? res.status(204).end()
          : res.status(404).json({ error: "Webhook destination not found." });
      } catch (error) {
        console.error("Cush Verify webhook destination deletion failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The webhook destination could not be deleted." });
      }
    },
  );

  app.post(
    "/api/v1/webhooks/:id/rotate-secret",
    scope,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "The destination ID is invalid." });
      try {
        const actor = await getWebhookAdmin(req);
        if (!actor) return res.status(403).json({ code: "ORGANISATION_ADMIN_REQUIRED", error: "Only an active organisation administrator can manage webhooks." });
        const signingSecret = randomBytes(32).toString("base64url");
        const encrypted = encryptCushVerifyWebhookSecret(signingSecret);
        const [rotated] = await db.transaction(async (tx) => {
          const [destination] = await tx.update(cushVerifyWebhookDestinations).set({
            ...encrypted,
            updatedAt: new Date(),
          }).where(and(
            eq(cushVerifyWebhookDestinations.id, id),
            eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
            eq(cushVerifyWebhookDestinations.environment, "production"),
            inArray(cushVerifyWebhookDestinations.status, ["active", "disabled"]),
          )).returning({ id: cushVerifyWebhookDestinations.id });
          if (!destination) return [];
          await tx.insert(cushVerifyWebhookAuditEvents).values({
            institutionId: actor.institutionId,
            destinationId: id,
            actorInstitutionalUserId: actor.userId,
            eventType: "secret_rotated",
            details: {},
          });
          return [destination];
        });
        if (!rotated) return res.status(404).json({ error: "Active webhook destination not found." });
        return res.json({
          destinationId: id,
          signingSecret,
          secretNotice: "Copy the new signing secret now. The previous secret is no longer valid.",
        });
      } catch (error) {
        console.error("Cush Verify webhook signing secret rotation failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "The signing secret could not be rotated." });
      }
    },
  );

  app.get(
    "/api/v1/webhooks/:id/deliveries",
    scope,
    requireApprovedInstitution,
    async (req: InstitutionalRequest, res) => {
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "The destination ID is invalid." });
      try {
        const actor = await getWebhookAdmin(req);
        if (!actor) return res.status(403).json({ code: "ORGANISATION_ADMIN_REQUIRED", error: "Only an active organisation administrator can view webhook deliveries." });
        const [destination] = await db.select({ id: cushVerifyWebhookDestinations.id })
          .from(cushVerifyWebhookDestinations)
          .where(and(
            eq(cushVerifyWebhookDestinations.id, id),
            eq(cushVerifyWebhookDestinations.institutionId, actor.institutionId),
            eq(cushVerifyWebhookDestinations.environment, "production"),
          )).limit(1);
        if (!destination) return res.status(404).json({ error: "Webhook destination not found." });
        const rows = await db.select({
          delivery: cushVerifyWebhookDeliveries,
          event: cushVerifyWebhookEvents,
        }).from(cushVerifyWebhookDeliveries)
          .innerJoin(cushVerifyWebhookEvents, eq(
            cushVerifyWebhookEvents.id,
            cushVerifyWebhookDeliveries.eventId,
          ))
          .where(and(
            eq(cushVerifyWebhookDeliveries.destinationId, id),
            eq(cushVerifyWebhookDeliveries.institutionId, actor.institutionId),
          ))
          .orderBy(desc(cushVerifyWebhookDeliveries.createdAt))
          .limit(100);
        const attemptsByDelivery = new Map<number, typeof cushVerifyWebhookDeliveryAttempts.$inferSelect[]>();
        if (rows.length) {
          const attempts = await db.select().from(cushVerifyWebhookDeliveryAttempts)
            .where(inArray(cushVerifyWebhookDeliveryAttempts.deliveryId, rows.map(({ delivery }) => delivery.id)))
            .orderBy(desc(cushVerifyWebhookDeliveryAttempts.startedAt));
          for (const attempt of attempts) {
            const items = attemptsByDelivery.get(attempt.deliveryId) ?? [];
            items.push(attempt);
            attemptsByDelivery.set(attempt.deliveryId, items);
          }
        }
        return res.json({
          deliveries: rows.map(({ delivery, event }) => ({
            id: delivery.id,
            eventId: event.id,
            eventType: event.eventType,
            status: delivery.status,
            attemptCount: delivery.attemptCount,
            lastStatusCode: delivery.lastStatusCode,
            lastErrorCode: delivery.lastErrorCode,
            createdAt: delivery.createdAt.toISOString(),
            deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
            attempts: (attemptsByDelivery.get(delivery.id) ?? []).map((attempt) => ({
              attemptNumber: attempt.attemptNumber,
              outcome: attempt.outcome,
              responseStatus: attempt.responseStatus,
              errorCode: attempt.errorCode,
              durationMs: attempt.durationMs,
              startedAt: attempt.startedAt.toISOString(),
              completedAt: attempt.completedAt?.toISOString() ?? null,
            })),
          })),
        });
      } catch (error) {
        console.error("Cush Verify webhook delivery history failed", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        return res.status(503).json({ error: "Webhook delivery history is temporarily unavailable." });
      }
    },
  );
}
