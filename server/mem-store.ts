/**
 * In-memory store for Cush Passport's current process.
 * Provides database-independent storage for the current process.
 * All data resets on server restart (acceptable for V1 MVP).
 */

import crypto from "crypto";
import {
  calculateCushScore,
  CUSH_SCORE_VERSION,
  type CushScorePolicy,
} from "./cush-score-service";

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
  score: number | null;
  provisionalScore: number | null;
  confidenceScore: number | null;
  assessmentStatus: "not_started" | "incomplete" | "provisional" | "complete";
  algorithmVersion: string;
  missingRequirements: string[];
  weightedContributions: {
    availableFunds: number | null;
    incomeStrength: number | null;
    cashFlow: number | null;
    creditHistory: number | null;
  } | null;
  legacyDataNotice: string | null;
  mode: "pre_arrival" | "post_arrival";
  shareToken: string | null;
  scoreBreakdown: {
    availableFunds: number | null;
    incomeStrength: number | null;
    cashFlow: number | null;
    creditHistory: number | null;
  } | null;
  reasonCodes: string[] | null;
  generatedAt: Date | null;
  lastUpdated: Date | null;
}

const LIVE_CUSH_SCORE_POLICY: CushScorePolicy = {
  // Thin-file scoring is defined by the product prompt; other mappings are
  // intentionally unavailable until an approved bureau taxonomy is supplied.
  creditMappings: {},
};

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
    score: null,
    provisionalScore: null,
    confidenceScore: null,
    assessmentStatus: "not_started",
    algorithmVersion: CUSH_SCORE_VERSION,
    missingRequirements: [],
    weightedContributions: null,
    legacyDataNotice: null,
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

  const result = calculateCushScore({
    individualUserId: userId,
    assessmentMonth: new Date().toISOString().slice(0, 7),
    destinationBaseline: null,
    hasSubmittedFinancialData: sigs.length > 0 || evs.length > 0,
    availableFunds: [],
    incomeHistory: [],
    sourceEvidenceQualities: [],
    cashFlowHistory: [],
    credit: { classification: "unavailable", evidenceQuality: null },
    dataAgeDays: null,
    coveredAccountCount: 0,
    declaredAccountCount: 0,
    integrityFlags: [],
  }, LIVE_CUSH_SCORE_POLICY);

  const updated: MemPassport = {
    ...passport,
    score: result.cushScore,
    provisionalScore: result.provisionalScore,
    confidenceScore: result.confidenceScore,
    assessmentStatus: result.assessmentStatus,
    algorithmVersion: result.algorithmVersion,
    missingRequirements: result.missingRequirements,
    weightedContributions: result.weightedContributions,
    legacyDataNotice: sigs.length > 0 || evs.length > 0
      ? "Existing financial signals and document submissions are preserved, but they do not contain the dated, supported V2 fields required for scoring."
      : null,
    scoreBreakdown: result.componentScores,
    reasonCodes: null,
    generatedAt: result.cushScore === null ? null : new Date(),
    lastUpdated: new Date(),
  };

  passports.set(passportId, updated);

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
  const id = ++signalSeq;
  const signal: MemSignal = {
    id,
    userId: params.userId,
    passportId: params.passportId,
    signalType: params.signalType,
    label: params.label,
    rawAmountCents: params.rawAmountCents,
    currencyCode: params.currencyCode,
    normalizedValue: null,
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
