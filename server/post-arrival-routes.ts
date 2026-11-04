import type { Express } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  confirmUkArrivalSchema,
  cushPostArrivalAuditLogs,
  cushPostArrivalProfiles,
  cushPostArrivalRecords,
  passports,
  postArrivalProfileDataSchema,
  postArrivalRecordSchema,
} from "@shared/schema";
import { db } from "./db";
import { isAuthenticated, type AuthenticatedRequest } from "./auth";
import { getOrCreatePassport } from "./mem-store";
import { authRateLimit } from "./security";

const profileUpdateSchema = postArrivalProfileDataSchema.partial().strict();

function isMissingPostArrivalSchema(error: unknown): boolean {
  return typeof error === "object" && error !== null &&
    "code" in error && ["42P01", "42703"].includes(String((error as { code?: unknown }).code));
}

function sendStorageError(res: import("express").Response, error: unknown) {
  if (isMissingPostArrivalSchema(error)) {
    return res.status(503).json({
      code: "POST_ARRIVAL_SCHEMA_MISSING",
      error: "Post-Arrival storage is not ready. Apply migrations/manual/create-cush-post-arrival.sql in the intended Supabase project.",
    });
  }
  console.error("Post-Arrival data operation failed.");
  return res.status(500).json({ error: "Could not save or load Post-Arrival information." });
}

async function ensureProfile(userId: number) {
  const [existing] = await db.select().from(cushPostArrivalProfiles)
    .where(eq(cushPostArrivalProfiles.userId, userId)).limit(1);
  if (existing) return existing;

  let wasPreviouslyArrived = getOrCreatePassport(userId).mode === "post_arrival";
  try {
    const [legacyPassport] = await db.select({ mode: passports.mode }).from(passports)
      .where(eq(passports.userId, userId)).limit(1);
    wasPreviouslyArrived ||= legacyPassport?.mode === "post_arrival";
  } catch (error) {
    if (!isMissingPostArrivalSchema(error) &&
        !(typeof error === "object" && error !== null && "code" in error &&
          String((error as { code?: unknown }).code) === "42P01")) {
      throw error;
    }
  }

  await db.insert(cushPostArrivalProfiles).values({
    userId,
    arrivalStatus: wasPreviouslyArrived ? "arrived" : "awaiting_arrival",
    arrivalDate: null,
    arrivalConfirmedAt: null,
    profileData: {},
  }).onConflictDoNothing();
  const [profile] = await db.select().from(cushPostArrivalProfiles)
    .where(eq(cushPostArrivalProfiles.userId, userId)).limit(1);
  if (!profile) throw new Error("Post-Arrival profile could not be initialized.");
  return profile;
}

export function registerPostArrivalRoutes(app: Express) {
  app.get("/api/passport/post-arrival", isAuthenticated, async (req: AuthenticatedRequest, res) => {
    res.setHeader("Cache-Control", "no-store, private");
    try {
      const userId = req.userId!;
      const [profile, records] = await Promise.all([
        ensureProfile(userId),
        db.select().from(cushPostArrivalRecords)
          .where(eq(cushPostArrivalRecords.userId, userId))
          .orderBy(desc(cushPostArrivalRecords.activityDate), desc(cushPostArrivalRecords.updatedAt)),
      ]);
      const profileData = postArrivalProfileDataSchema.safeParse(profile.profileData);
      return res.json({
        profile: {
          arrivalStatus: profile.arrivalStatus,
          arrivalDate: profile.arrivalDate,
          arrivalConfirmedAt: profile.arrivalConfirmedAt,
          data: profileData.success ? profileData.data : {},
          updatedAt: profile.updatedAt,
        },
        records,
      });
    } catch (error) {
      return sendStorageError(res, error);
    }
  });

  app.post("/api/passport/post-arrival/confirm", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    const parsed = confirmUkArrivalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Enter a valid UK arrival date." });
    }
    if (parsed.data.arrivalDate > new Date().toISOString().slice(0, 10)) {
      return res.status(400).json({ error: "Arrival date cannot be in the future." });
    }
    try {
      const userId = req.userId!;
      const current = await ensureProfile(userId);
      const firstConfirmation = current.arrivalStatus !== "arrived";
      const updatedAt = new Date();
      const [profile] = await db.transaction(async (tx) => {
        const result = await tx.update(cushPostArrivalProfiles).set({
          arrivalStatus: "arrived",
          arrivalDate: parsed.data.arrivalDate,
          arrivalConfirmedAt: current.arrivalConfirmedAt ?? updatedAt,
          updatedAt,
        }).where(eq(cushPostArrivalProfiles.userId, userId)).returning();
        if (current.arrivalDate !== parsed.data.arrivalDate || firstConfirmation) {
          await tx.insert(cushPostArrivalAuditLogs).values({
            userId,
            action: firstConfirmation ? "arrival_confirmed" : "arrival_date_updated",
            resourceType: "arrival_profile",
            resourceId: String(userId),
          });
        }
        return result;
      });
      return res.json({ success: true, profile });
    } catch (error) {
      return sendStorageError(res, error);
    }
  });

  app.put("/api/passport/post-arrival/profile", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    const parsed = profileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid Post-Arrival profile." });
    }
    try {
      const userId = req.userId!;
      const current = await ensureProfile(userId);
      if (current.arrivalStatus !== "arrived") {
        return res.status(409).json({ error: "Confirm your UK arrival before adding Post-Arrival details." });
      }
      const currentData = postArrivalProfileDataSchema.safeParse(current.profileData);
      const mergedData = postArrivalProfileDataSchema.parse({
        ...(currentData.success ? currentData.data : {}),
        ...parsed.data,
      });
      const updatedAt = new Date();
      const [profile] = await db.transaction(async (tx) => {
        const result = await tx.update(cushPostArrivalProfiles).set({
          profileData: mergedData,
          updatedAt,
        }).where(eq(cushPostArrivalProfiles.userId, userId)).returning();
        await tx.insert(cushPostArrivalAuditLogs).values({
          userId,
          action: "profile_updated",
          resourceType: "arrival_profile",
          resourceId: String(userId),
        });
        return result;
      });
      return res.json({ success: true, profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid Post-Arrival profile." });
      }
      return sendStorageError(res, error);
    }
  });

  app.post("/api/passport/post-arrival/records", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    const parsed = postArrivalRecordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid financial record." });
    }
    try {
      const userId = req.userId!;
      const profile = await ensureProfile(userId);
      if (profile.arrivalStatus !== "arrived") {
        return res.status(409).json({ error: "Confirm your UK arrival before adding Post-Arrival details." });
      }
      const input = parsed.data;
      if ((input.recordType === "income" || input.recordType === "financial_activity") &&
          typeof input.activityDate === "string" &&
          input.activityDate > new Date().toISOString().slice(0, 10)) {
        return res.status(400).json({ error: "Received income and financial activity dates cannot be in the future." });
      }
      const [record] = await db.transaction(async (tx) => {
        const [created] = await tx.insert(cushPostArrivalRecords).values({
          userId,
          recordType: input.recordType,
          label: input.label,
          details: input.details,
          activityDate: input.activityDate ?? null,
          countryCode: input.countryCode,
          currencyCode: input.currencyCode,
          evidenceStatus: "user_recorded",
        }).returning();
        await tx.insert(cushPostArrivalAuditLogs).values({
          userId,
          action: "record_created",
          resourceType: input.recordType,
          resourceId: String(created.id),
        });
        return [created];
      });
      return res.status(201).json({ record });
    } catch (error) {
      return sendStorageError(res, error);
    }
  });

  app.put("/api/passport/post-arrival/records/:id", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    const parsed = postArrivalRecordSchema.safeParse(req.body);
    if (!Number.isSafeInteger(id) || id < 1 || !parsed.success) {
      return res.status(400).json({ error: parsed.success ? "Invalid record ID." : parsed.error.errors[0]?.message ?? "Invalid financial record." });
    }
    try {
      const userId = req.userId!;
      const profile = await ensureProfile(userId);
      if (profile.arrivalStatus !== "arrived") {
        return res.status(409).json({ error: "Confirm your UK arrival before changing Post-Arrival details." });
      }
      const input = parsed.data;
      if ((input.recordType === "income" || input.recordType === "financial_activity") &&
          typeof input.activityDate === "string" &&
          input.activityDate > new Date().toISOString().slice(0, 10)) {
        return res.status(400).json({ error: "Received income and financial activity dates cannot be in the future." });
      }
      const [record] = await db.transaction(async (tx) => {
        const result = await tx.update(cushPostArrivalRecords).set({
          recordType: input.recordType,
          label: input.label,
          details: input.details,
          activityDate: input.activityDate ?? null,
          countryCode: input.countryCode,
          currencyCode: input.currencyCode,
          updatedAt: new Date(),
        }).where(and(
          eq(cushPostArrivalRecords.id, id),
          eq(cushPostArrivalRecords.userId, userId),
        ))
          .returning();
        if (result[0]) {
          await tx.insert(cushPostArrivalAuditLogs).values({
            userId,
            action: "record_updated",
            resourceType: input.recordType,
            resourceId: String(id),
          });
        }
        return result;
      });
      return record ? res.json({ record }) : res.status(404).json({ error: "Post-Arrival record not found." });
    } catch (error) {
      return sendStorageError(res, error);
    }
  });

  app.delete("/api/passport/post-arrival/records/:id", isAuthenticated, authRateLimit, async (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) return res.status(400).json({ error: "Invalid record ID." });
    try {
      const userId = req.userId!;
      const profile = await ensureProfile(userId);
      if (profile.arrivalStatus !== "arrived") {
        return res.status(409).json({ error: "Confirm your UK arrival before changing Post-Arrival details." });
      }
      const [deleted] = await db.transaction(async (tx) => {
        const result = await tx.delete(cushPostArrivalRecords).where(and(
          eq(cushPostArrivalRecords.id, id),
          eq(cushPostArrivalRecords.userId, userId),
        )).returning({ id: cushPostArrivalRecords.id });
        if (result[0]) {
          await tx.insert(cushPostArrivalAuditLogs).values({
            userId,
            action: "record_deleted",
            resourceType: "post_arrival_record",
            resourceId: String(id),
          });
        }
        return result;
      });
      return deleted ? res.json({ success: true }) : res.status(404).json({ error: "Post-Arrival record not found." });
    } catch (error) {
      return sendStorageError(res, error);
    }
  });
}
