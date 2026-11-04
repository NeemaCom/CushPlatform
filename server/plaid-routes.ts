import type { Express, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { cushPlaidConnections, cushPostArrivalProfiles } from "@shared/schema";
import { db } from "./db";
import { isAuthenticated, type AuthenticatedRequest } from "./auth";
import { authRateLimit } from "./security";
import { isMissingPlaidSchema } from "./plaid-errors";
import {
  createPlaidLinkToken,
  decryptPlaidAccessToken,
  encryptPlaidAccessToken,
  exchangePlaidPublicToken,
  getPlaidReview,
  getPlaidRuntimeStatus,
  PlaidNotConfiguredError,
  PlaidRequestError,
  removePlaidItem,
} from "./plaid-service";

declare module "express-session" {
  interface SessionData {
    plaidConsent?: {
      userId: number;
      acceptedAt: string;
      expiresAt: number;
    };
  }
}

const linkConsentSchema = z.object({ consentAccepted: z.literal(true) }).strict();
const exchangeSchema = z.object({
  publicToken: z.string().trim().min(1).max(2_000),
  institutionName: z.string().trim().max(120).nullable().optional(),
}).strict();
const connectionIdSchema = z.coerce.number().int().positive();
const PLAID_CONSENT_LIFETIME_MS = 3 * 60 * 60 * 1000;

function noStore(res: Response) {
  res.setHeader("Cache-Control", "no-store, private");
  res.setHeader("Pragma", "no-cache");
}

function storageFailure(res: Response, error: unknown) {
  if (isMissingPlaidSchema(error)) {
    return res.status(503).json({
      error: "Plaid storage is not ready. Apply migrations/manual/create-cush-plaid-connections.sql in the intended Supabase project.",
      code: "PLAID_SCHEMA_MISSING",
    });
  }
  console.error("Plaid connection storage operation failed.");
  return res.status(500).json({ error: "Could not manage this Plaid connection." });
}

function providerFailure(res: Response, error: unknown) {
  if (error instanceof PlaidNotConfiguredError) {
    return res.status(503).json({ error: "Plaid is not configured on the service." });
  }
  if (error instanceof PlaidRequestError) {
    const status = error.status === 429 ? 429 : 503;
    return res.status(status).json({
      error: "Plaid could not complete the request. Check your connection and try again.",
    });
  }
  console.error("Plaid provider request failed.");
  return res.status(503).json({ error: "Plaid is temporarily unavailable." });
}

async function hasConfirmedArrival(userId: number): Promise<boolean> {
  const [profile] = await db.select({ arrivalStatus: cushPostArrivalProfiles.arrivalStatus })
    .from(cushPostArrivalProfiles)
    .where(eq(cushPostArrivalProfiles.userId, userId))
    .limit(1);
  return profile?.arrivalStatus === "arrived";
}

async function saveSession(req: AuthenticatedRequest): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

export function registerPlaidRoutes(app: Express) {
  app.get("/api/passport/post-arrival/plaid", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    try {
      const userId = req.userId!;
      if (!await hasConfirmedArrival(userId)) {
        return res.status(409).json({ error: "Confirm your UK arrival before connecting a bank." });
      }
      const status = getPlaidRuntimeStatus();
      const connections = await db.select({
        id: cushPlaidConnections.id,
        institutionName: cushPlaidConnections.institutionName,
        linkedAt: cushPlaidConnections.linkedAt,
      }).from(cushPlaidConnections)
        .where(eq(cushPlaidConnections.userId, userId))
        .orderBy(desc(cushPlaidConnections.linkedAt));
      return res.json({
        ...status,
        schemaReady: true,
        connections: connections.map((connection) => ({
          ...connection,
          linkedAt: connection.linkedAt.toISOString(),
        })),
      });
    } catch (error) {
      if (isMissingPlaidSchema(error)) {
        return res.json({
          ...getPlaidRuntimeStatus(),
          schemaReady: false,
          connections: [],
        });
      }
      return storageFailure(res, error);
    }
  });

  app.post("/api/passport/post-arrival/plaid/link-token", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const parsed = linkConsentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Accept the Plaid connection notice before continuing." });
    }
    try {
      const userId = req.userId!;
      if (!await hasConfirmedArrival(userId)) {
        return res.status(409).json({ error: "Confirm your UK arrival before connecting a bank." });
      }
      const linkToken = await createPlaidLinkToken(userId);
      const acceptedAt = new Date().toISOString();
      req.session.plaidConsent = {
        userId,
        acceptedAt,
        expiresAt: Date.now() + PLAID_CONSENT_LIFETIME_MS,
      };
      await saveSession(req);
      return res.json({ linkToken });
    } catch (error) {
      if (isMissingPlaidSchema(error)) return storageFailure(res, error);
      return providerFailure(res, error);
    }
  });

  app.post("/api/passport/post-arrival/plaid/exchange", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const parsed = exchangeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid Plaid connection." });
    }
    const userId = req.userId!;
    const consent = req.session.plaidConsent;
    if (!consent || consent.userId !== userId || consent.expiresAt <= Date.now()) {
      delete req.session.plaidConsent;
      return res.status(403).json({ error: "Your Plaid consent session expired. Please accept the notice and reconnect." });
    }

    let accessToken = "";
    let itemId = "";
    try {
      if (!await hasConfirmedArrival(userId)) {
        return res.status(409).json({ error: "Confirm your UK arrival before connecting a bank." });
      }
      ({ accessToken, itemId } = await exchangePlaidPublicToken(parsed.data.publicToken));
      const encrypted = encryptPlaidAccessToken(accessToken);
      const [existing] = await db.select({
        id: cushPlaidConnections.id,
        userId: cushPlaidConnections.userId,
        linkedAt: cushPlaidConnections.linkedAt,
      }).from(cushPlaidConnections)
        .where(eq(cushPlaidConnections.plaidItemId, itemId))
        .limit(1);

      if (existing && existing.userId !== userId) {
        return res.status(409).json({ error: "This bank connection is already linked to another Cush account." });
      }

      const institutionName = parsed.data.institutionName?.trim() || null;
      const acceptedAt = new Date(consent.acceptedAt);
      let saved;
      if (existing) {
        [saved] = await db.update(cushPlaidConnections).set({
          institutionName,
          accessTokenCiphertext: encrypted.ciphertext,
          accessTokenIv: encrypted.iv,
          accessTokenAuthTag: encrypted.authTag,
          identityConsentAcceptedAt: acceptedAt,
          transactionsConsentAcceptedAt: acceptedAt,
          updatedAt: new Date(),
        }).where(and(
          eq(cushPlaidConnections.id, existing.id),
          eq(cushPlaidConnections.userId, userId),
        )).returning({
          id: cushPlaidConnections.id,
          institutionName: cushPlaidConnections.institutionName,
          linkedAt: cushPlaidConnections.linkedAt,
        });
      } else {
        try {
          [saved] = await db.insert(cushPlaidConnections).values({
            userId,
            plaidItemId: itemId,
            institutionName,
            accessTokenCiphertext: encrypted.ciphertext,
            accessTokenIv: encrypted.iv,
            accessTokenAuthTag: encrypted.authTag,
            identityConsentAcceptedAt: acceptedAt,
            transactionsConsentAcceptedAt: acceptedAt,
          }).returning({
            id: cushPlaidConnections.id,
            institutionName: cushPlaidConnections.institutionName,
            linkedAt: cushPlaidConnections.linkedAt,
          });
        } catch (error) {
          const isDuplicate = typeof error === "object" && error !== null &&
            "code" in error && String((error as { code?: unknown }).code) === "23505";
          if (!isDuplicate) {
            try {
              await removePlaidItem(accessToken);
            } catch {
              // The database failure is reported below; never log provider credentials.
            }
          }
          throw error;
        }
      }
      if (!saved) throw new Error("Plaid connection was not saved.");
      delete req.session.plaidConsent;
      await saveSession(req);
      return res.status(201).json({
        connection: { ...saved, linkedAt: saved.linkedAt.toISOString() },
      });
    } catch (error) {
      if (isMissingPlaidSchema(error)) return storageFailure(res, error);
      if (typeof error === "object" && error !== null && "code" in error &&
          String((error as { code?: unknown }).code) === "23505") {
        return res.status(409).json({ error: "This bank is already connected to Cush." });
      }
      if (error instanceof PlaidNotConfiguredError || error instanceof PlaidRequestError) {
        return providerFailure(res, error);
      }
      return storageFailure(res, error);
    }
  });

  app.post("/api/passport/post-arrival/plaid/connections/:id/refresh", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const id = connectionIdSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "Invalid Plaid connection." });
    try {
      const userId = req.userId!;
      if (!await hasConfirmedArrival(userId)) {
        return res.status(409).json({ error: "Confirm your UK arrival before reviewing bank data." });
      }
      const [connection] = await db.select({
        ciphertext: cushPlaidConnections.accessTokenCiphertext,
        iv: cushPlaidConnections.accessTokenIv,
        authTag: cushPlaidConnections.accessTokenAuthTag,
      }).from(cushPlaidConnections).where(and(
        eq(cushPlaidConnections.id, id.data),
        eq(cushPlaidConnections.userId, userId),
      )).limit(1);
      if (!connection) return res.status(404).json({ error: "Plaid connection not found." });
      const accessToken = decryptPlaidAccessToken({
        ciphertext: connection.ciphertext,
        iv: connection.iv,
        authTag: connection.authTag,
      });
      return res.json(await getPlaidReview(accessToken));
    } catch (error) {
      if (isMissingPlaidSchema(error)) return storageFailure(res, error);
      if (error instanceof PlaidNotConfiguredError || error instanceof PlaidRequestError) {
        return providerFailure(res, error);
      }
      return storageFailure(res, error);
    }
  });

  app.delete("/api/passport/post-arrival/plaid/connections/:id", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    noStore(res);
    const id = connectionIdSchema.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: "Invalid Plaid connection." });
    try {
      const userId = req.userId!;
      const [connection] = await db.select({
        id: cushPlaidConnections.id,
        ciphertext: cushPlaidConnections.accessTokenCiphertext,
        iv: cushPlaidConnections.accessTokenIv,
        authTag: cushPlaidConnections.accessTokenAuthTag,
      }).from(cushPlaidConnections).where(and(
        eq(cushPlaidConnections.id, id.data),
        eq(cushPlaidConnections.userId, userId),
      )).limit(1);
      if (!connection) return res.status(404).json({ error: "Plaid connection not found." });
      const accessToken = decryptPlaidAccessToken({
        ciphertext: connection.ciphertext,
        iv: connection.iv,
        authTag: connection.authTag,
      });
      await removePlaidItem(accessToken);
      await db.delete(cushPlaidConnections).where(and(
        eq(cushPlaidConnections.id, connection.id),
        eq(cushPlaidConnections.userId, userId),
      ));
      return res.json({ success: true });
    } catch (error) {
      if (isMissingPlaidSchema(error)) return storageFailure(res, error);
      if (error instanceof PlaidNotConfiguredError || error instanceof PlaidRequestError) {
        return providerFailure(res, error);
      }
      return storageFailure(res, error);
    }
  });
}
