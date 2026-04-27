/**
 * In-memory store for Cush Passport V1
 * Provides database-independent persistence for the current process.
 * All data resets on server restart (acceptable for V1 MVP).
 */

import crypto from "crypto";
import { normalizationService } from "./normalization-service";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface MemUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  firebaseUid?: string;
  phoneNumber?: string;
  nationality?: string;
  profilePicture?: string;
  gender?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  acceptTerms?: boolean;
  acceptPrivacy?: boolean;
  marketingConsent?: boolean;
  mfaEnabled?: boolean;
  lastLoginAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MemPassport {
  id: number;
  userId: number;
  score: number;
  confidenceScore: number;
  mode: "pre_arrival" | "post_arrival";
  shareToken: string | null;
  scoreBreakdown: { incomeScore: number; surplusScore: number; stabilityScore: number } | null;
  reasonCodes: string[] | null;
  generatedAt: Date | null;
  lastUpdated: Date | null;
}

export interface MemSignal {
  id: number;
  userId: number;
  passportId: number;
  signalType: string;
  label: string;
  rawAmountCents: number;
  currencyCode: string;
  normalizedValue: string | null;
  country: string;
  period: string;
  verificationStatus: string;
  recordedAt: Date;
}

export interface MemEvidence {
  id: number;
  userId: number;
  passportId: number;
  documentType: string;
  label: string;
  tier: number;
  scoreBoost: number;
  fileData: string | null;
  fileName: string | null;
  status: string;
  submittedAt: Date;
}

// ── Counters ───────────────────────────────────────────────────────────────────

let userSeq = 1000;
let passportSeq = 1;
let signalSeq = 1;
let evidenceSeq = 1;

// ── Maps ───────────────────────────────────────────────────────────────────────

const users = new Map<number, MemUser>();
const usersByEmail = new Map<string, number>();
const usersByFirebaseUid = new Map<string, number>();

const passports = new Map<number, MemPassport>();
const passportsByUserId = new Map<number, number>();

const signals = new Map<number, MemSignal>();
const evidence = new Map<number, MemEvidence>();

const shareTokenIndex = new Map<string, number>(); // shareToken → passportId

// ── Score Boost Map ────────────────────────────────────────────────────────────

const BOOST_MAP: Record<string, number> = {
  payslip: 40,
  bank_statement: 30,
  proof_of_residency: 20,
  tax_return: 50,
  employment_contract: 35,
  transfer_receipt: 25,
};

// ── User Operations ───────────────────────────────────────────────────────────

export function getUser(id: number): MemUser | undefined {
  return users.get(id);
}

export function getUserByEmail(email: string): MemUser | undefined {
  const id = usersByEmail.get(email.toLowerCase());
  return id !== undefined ? users.get(id) : undefined;
}

export function getUserByFirebaseUid(uid: string): MemUser | undefined {
  const id = usersByFirebaseUid.get(uid);
  return id !== undefined ? users.get(id) : undefined;
}

export function createOrUpdateUserFromFirebase(params: {
  firebaseUid: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
}): MemUser {
  let user = getUserByFirebaseUid(params.firebaseUid) ?? getUserByEmail(params.email);

  if (user) {
    user.firebaseUid = params.firebaseUid;
    user.firstName = params.firstName || user.firstName;
    user.lastName = params.lastName || user.lastName;
    user.lastLoginAt = new Date();
    user.updatedAt = new Date();
    users.set(user.id, user);
    usersByFirebaseUid.set(params.firebaseUid, user.id);
    return user;
  }

  const id = ++userSeq;
  const email = params.email.toLowerCase();
  const [fl, ll] = params.firstName ? [params.firstName, params.lastName] : (params.displayName ?? "").split(" ");
  const newUser: MemUser = {
    id,
    username: email.split("@")[0],
    email,
    firstName: fl || "User",
    lastName: ll || "",
    role: "customer",
    firebaseUid: params.firebaseUid,
    isEmailVerified: true,
    acceptTerms: true,
    acceptPrivacy: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: new Date(),
  };

  users.set(id, newUser);
  usersByEmail.set(email, id);
  usersByFirebaseUid.set(params.firebaseUid, id);
  return newUser;
}

// ── Passport Operations ───────────────────────────────────────────────────────

export function getOrCreatePassport(userId: number): MemPassport {
  const existingId = passportsByUserId.get(userId);
  if (existingId !== undefined) {
    const p = passports.get(existingId)!;
    return p;
  }

  const id = ++passportSeq;
  const passport: MemPassport = {
    id,
    userId,
    score: 0,
    confidenceScore: 0,
    mode: "pre_arrival",
    shareToken: null,
    scoreBreakdown: null,
    reasonCodes: null,
    generatedAt: null,
    lastUpdated: null,
  };
  passports.set(id, passport);
  passportsByUserId.set(userId, id);
  return passport;
}

export function getPassportSignals(passportId: number): MemSignal[] {
  return Array.from(signals.values()).filter((s) => s.passportId === passportId);
}

export function getPassportEvidence(passportId: number): MemEvidence[] {
  return Array.from(evidence.values()).filter((e) => e.passportId === passportId);
}

export function recalculatePassport(passportId: number, userId: number): MemPassport {
  const passport = passports.get(passportId);
  if (!passport) throw new Error("Passport not found");

  const sigs = getPassportSignals(passportId);
  const evs = getPassportEvidence(passportId);

  const signalInputs = sigs.map((s) => ({
    type: s.signalType as "income" | "surplus" | "transfer" | "stability",
    rawAmountCents: s.rawAmountCents,
    currencyCode: s.currencyCode,
    country: s.country,
    period: s.period as "monthly" | "annual",
  }));

  const evidenceInputs = evs.map((e) => ({
    status: e.status,
    scoreBoost: e.scoreBoost,
  }));

  const result = normalizationService.calculatePassportScore(signalInputs, evidenceInputs);

  const updated: MemPassport = {
    ...passport,
    score: result.finalScore,
    confidenceScore: result.confidenceScore,
    scoreBreakdown: {
      incomeScore: result.incomeScore,
      surplusScore: result.surplusScore,
      stabilityScore: result.stabilityScore,
    },
    reasonCodes: result.reasonCodes,
    generatedAt: result.generatedAt,
    lastUpdated: new Date(),
  };

  passports.set(passportId, updated);

  // Update normalized values on signals
  for (const sig of sigs) {
    const normalized = normalizationService.normalizeSignal({
      type: sig.signalType as "income" | "surplus" | "transfer" | "stability",
      rawAmountCents: sig.rawAmountCents,
      currencyCode: sig.currencyCode,
      country: sig.country,
      period: sig.period as "monthly" | "annual",
    });
    const updatedSig = signals.get(sig.id);
    if (updatedSig) {
      updatedSig.normalizedValue = String(normalized.normalizedValue);
      signals.set(sig.id, updatedSig);
    }
  }

  return updated;
}

// ── Signal Operations ─────────────────────────────────────────────────────────

export function addSignal(params: {
  userId: number;
  passportId: number;
  signalType: string;
  label: string;
  rawAmountCents: number;
  currencyCode: string;
  country: string;
  period: string;
}): MemSignal {
  const normalized = normalizationService.normalizeSignal({
    type: params.signalType as "income" | "surplus" | "transfer" | "stability",
    rawAmountCents: params.rawAmountCents,
    currencyCode: params.currencyCode,
    country: params.country,
    period: params.period as "monthly" | "annual",
  });

  const id = ++signalSeq;
  const signal: MemSignal = {
    id,
    userId: params.userId,
    passportId: params.passportId,
    signalType: params.signalType,
    label: params.label,
    rawAmountCents: params.rawAmountCents,
    currencyCode: params.currencyCode,
    normalizedValue: String(normalized.normalizedValue),
    country: params.country,
    period: params.period,
    verificationStatus: "SELF_REPORTED",
    recordedAt: new Date(),
  };
  signals.set(id, signal);
  return signal;
}

export function deleteSignal(signalId: number, userId: number): MemSignal | null {
  const signal = signals.get(signalId);
  if (!signal || signal.userId !== userId) return null;
  signals.delete(signalId);
  return signal;
}

export function getSignal(signalId: number): MemSignal | undefined {
  return signals.get(signalId);
}

// ── Evidence Operations ───────────────────────────────────────────────────────

export function addEvidence(params: {
  userId: number;
  passportId: number;
  documentType: string;
  label: string;
  tier: number;
  fileData?: string | null;
  fileName?: string | null;
}): MemEvidence {
  const id = ++evidenceSeq;
  const item: MemEvidence = {
    id,
    userId: params.userId,
    passportId: params.passportId,
    documentType: params.documentType,
    label: params.label,
    tier: params.tier,
    scoreBoost: BOOST_MAP[params.documentType] ?? 20,
    fileData: params.fileData ?? null,
    fileName: params.fileName ?? null,
    status: params.fileData ? "PENDING_REVIEW" : "SELF_REPORTED",
    submittedAt: new Date(),
  };
  evidence.set(id, item);
  return item;
}

export function deleteEvidence(evidenceId: number, userId: number): MemEvidence | null {
  const item = evidence.get(evidenceId);
  if (!item || item.userId !== userId) return null;
  evidence.delete(evidenceId);
  return item;
}

export function getEvidenceItem(evidenceId: number): MemEvidence | undefined {
  return evidence.get(evidenceId);
}

// ── Share Token ───────────────────────────────────────────────────────────────

export function generateShareToken(passportId: number): string {
  const token = crypto.randomBytes(20).toString("base64url");
  const passport = passports.get(passportId);
  if (passport) {
    if (passport.shareToken) shareTokenIndex.delete(passport.shareToken);
    passport.shareToken = token;
    passport.lastUpdated = new Date();
    passports.set(passportId, passport);
  }
  shareTokenIndex.set(token, passportId);
  return token;
}

export function getPassportByShareToken(token: string): MemPassport | undefined {
  const id = shareTokenIndex.get(token);
  return id !== undefined ? passports.get(id) : undefined;
}

export function updatePassportMode(passportId: number, mode: "pre_arrival" | "post_arrival"): MemPassport {
  const passport = passports.get(passportId);
  if (!passport) throw new Error("Passport not found");
  passport.mode = mode;
  passport.lastUpdated = new Date();
  passports.set(passportId, passport);
  return passport;
}
