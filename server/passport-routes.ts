/**
 * Cush Passport V1 — API Routes (in-memory store)
 * All routes under /api/passport/*
 */
import type { Express } from "express";
import { z } from "zod";
import { isAuthenticated, type AuthenticatedRequest } from "./auth";
import { normalizationService } from "./normalization-service";
import {
  addSignalSchema,
  addEvidenceSchema,
  updatePassportModeSchema,
} from "@shared/schema";
import * as mem from "./mem-store";

// ─── Route Registration ──────────────────────────────────────────────────────

export function registerPassportRoutes(app: Express) {

  // GET /api/passport/me — fetch or auto-create the user's passport
  app.get("/api/passport/me", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const passport = mem.getOrCreatePassport(userId);
      const signals = mem.getPassportSignals(passport.id);
      const evidence = mem.getPassportEvidence(passport.id);
      return res.json({ passport, signals, evidence });
    } catch (err) {
      console.error("GET /api/passport/me error:", err);
      return res.status(500).json({ error: "Failed to fetch passport" });
    }
  });

  // POST /api/passport/signals — add a financial signal
  app.post("/api/passport/signals", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const data = addSignalSchema.parse(req.body);
      const passport = mem.getOrCreatePassport(userId);

      const signal = mem.addSignal({
        userId,
        passportId: passport.id,
        signalType: data.signalType,
        label: data.label ?? data.signalType,
        rawAmountCents: data.rawAmountCents,
        currencyCode: data.currencyCode,
        country: data.country,
        period: data.period ?? "monthly",
      });

      const updatedPassport = mem.recalculatePassport(passport.id, userId);
      return res.status(201).json({ signal, passport: updatedPassport });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("POST /api/passport/signals error:", err);
      return res.status(500).json({ error: "Failed to add signal" });
    }
  });

  // DELETE /api/passport/signals/:id — remove a signal
  app.delete("/api/passport/signals/:id", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const signalId = parseInt(req.params.id);
      const existing = mem.getSignal(signalId);

      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Signal not found" });
      }

      mem.deleteSignal(signalId, userId);
      const updatedPassport = mem.recalculatePassport(existing.passportId, userId);
      return res.json({ success: true, passport: updatedPassport });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete signal" });
    }
  });

  // POST /api/passport/evidence — add an evidence item
  app.post("/api/passport/evidence", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const data = addEvidenceSchema.parse(req.body);
      const passport = mem.getOrCreatePassport(userId);

      const item = mem.addEvidence({
        userId,
        passportId: passport.id,
        documentType: data.documentType,
        label: data.label,
        tier: data.tier,
        fileData: data.fileData ?? null,
        fileName: data.fileName ?? null,
      });

      const updatedPassport = mem.recalculatePassport(passport.id, userId);
      return res.status(201).json({ item, passport: updatedPassport });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      console.error("POST /api/passport/evidence error:", err);
      return res.status(500).json({ error: "Failed to add evidence" });
    }
  });

  // DELETE /api/passport/evidence/:id
  app.delete("/api/passport/evidence/:id", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const itemId = parseInt(req.params.id);
      const existing = mem.getEvidenceItem(itemId);

      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Evidence item not found" });
      }

      mem.deleteEvidence(itemId, userId);
      const updatedPassport = mem.recalculatePassport(existing.passportId, userId);
      return res.json({ success: true, passport: updatedPassport });
    } catch (err) {
      return res.status(500).json({ error: "Failed to delete evidence" });
    }
  });

  // PUT /api/passport/mode — toggle pre_arrival / post_arrival
  app.put("/api/passport/mode", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const { mode } = updatePassportModeSchema.parse(req.body);

      if (mode === "post_arrival") {
        const passport = mem.getOrCreatePassport(userId);
        const evs = mem.getPassportEvidence(passport.id);
        const hasProof = evs.some((e) => e.documentType === "proof_of_residency");
        if (!hasProof) {
          return res.status(400).json({
            error: "Proof of Residency required to switch to Post-Arrival mode",
            code: "REQUIRES_PROOF_OF_RESIDENCY",
          });
        }
      }

      const passport = mem.getOrCreatePassport(userId);
      const updated = mem.updatePassportMode(passport.id, mode);
      return res.json({ passport: updated });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      return res.status(500).json({ error: "Failed to update mode" });
    }
  });

  // POST /api/passport/generate-token — create / refresh public share token
  app.post("/api/passport/generate-token", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const passport = mem.getOrCreatePassport(userId);
      const token = mem.generateShareToken(passport.id);
      const updated = mem.getOrCreatePassport(userId);
      return res.json({ shareToken: token, passport: updated });
    } catch (err) {
      return res.status(500).json({ error: "Failed to generate share token" });
    }
  });

  // GET /api/passport/public/:token — unauthenticated landlord view
  app.get("/api/passport/public/:token", (req, res) => {
    try {
      const { token } = req.params;
      const passport = mem.getPassportByShareToken(token);

      if (!passport) {
        return res.status(404).json({ error: "Passport not found" });
      }

      const evidence = mem.getPassportEvidence(passport.id).map((e) => ({
        documentType: e.documentType,
        label: e.label,
        status: e.status,
        tier: e.tier,
      }));

      const signals = mem.getPassportSignals(passport.id).map((s) => ({
        signalType: s.signalType,
        label: s.label,
        country: s.country,
        currencyCode: s.currencyCode,
        normalizedValue: s.normalizedValue,
        verificationStatus: s.verificationStatus,
      }));

      const confidence = normalizationService.getConfidenceLabel(passport.confidenceScore);

      return res.json({
        score: passport.score,
        confidenceScore: passport.confidenceScore,
        confidenceLabel: confidence.label,
        mode: passport.mode,
        scoreBreakdown: passport.scoreBreakdown,
        reasonCodes: passport.reasonCodes ?? [],
        lastUpdated: passport.lastUpdated,
        evidence,
        signals,
      });
    } catch (err) {
      console.error("GET /api/passport/public/:token error:", err);
      return res.status(500).json({ error: "Failed to fetch public passport" });
    }
  });

  // POST /api/passport/recalculate — force score recalculation
  app.post("/api/passport/recalculate", isAuthenticated, (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.userId!;
      const passport = mem.getOrCreatePassport(userId);
      const updated = mem.recalculatePassport(passport.id, userId);
      return res.json({ passport: updated });
    } catch (err) {
      return res.status(500).json({ error: "Failed to recalculate score" });
    }
  });

  // GET /api/passport/benchmarks — return available PPP country benchmarks
  app.get("/api/passport/benchmarks", (_req, res) => {
    return res.json(normalizationService.getAllBenchmarks());
  });
}
