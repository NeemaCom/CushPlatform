import { pgTable, text, serial, integer, decimal, timestamp, boolean, json, jsonb, bigint, check, index, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations, sql } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firebaseUid: text("firebase_uid").unique(),
  role: text("role").default("user"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number"),
  nationality: text("nationality"),
  profilePicture: text("profile_picture"),
  gender: text("gender"),
  isEmailVerified: boolean("is_email_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  acceptTerms: boolean("accept_terms").notNull(),
  acceptPrivacy: boolean("accept_privacy").notNull(),
  marketingConsent: boolean("marketing_consent").default(false),
  mfaEnabled: boolean("mfa_enabled").default(false),
  lastLoginAt: timestamp("last_login_at"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}).enableRLS();

export type ConsentPolicyType = "terms" | "privacy";

export const userConsentRecords = pgTable("user_consent_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  policyType: text("policy_type").$type<ConsentPolicyType>().notNull(),
  policyVersion: text("policy_version").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  policyTypeCheck: check(
    "user_consent_records_policy_type_check",
    sql`${table.policyType} in ('terms', 'privacy')`,
  ),
  oneRecordPerPolicyVersion: unique("user_consent_records_user_policy_version_unique")
    .on(table.userId, table.policyType, table.policyVersion),
  userAcceptedAtIndex: index("user_consent_records_user_accepted_at_idx")
    .on(table.userId, table.acceptedAt),
})).enableRLS();

export const insertUserSchema = createInsertSchema(users).omit({
  id: true, createdAt: true, updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SafeUser = Omit<User, "passwordHash" | "passwordResetToken" | "passwordResetExpires">;

// ─── Passports ────────────────────────────────────────────────────────────────

export const passports = pgTable("passports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  score: integer("score").notNull().default(0),
  confidenceScore: integer("confidence_score").notNull().default(0),
  mode: text("mode").notNull().default("pre_arrival"),
  shareToken: text("share_token").unique(),
  scoreBreakdown: json("score_breakdown").$type<{
    availableFunds: number | null;
    incomeStrength: number | null;
    cashFlow: number | null;
    creditHistory: number | null;
  }>(),
  reasonCodes: text("reason_codes").array(),
  generatedAt: timestamp("generated_at"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
}).enableRLS();

// ─── Cush Score V2 Inputs and Policy ──────────────────────────────────────────

export const cushAssessmentInputs = pgTable("cush_assessment_inputs", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  inputData: jsonb("input_data").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}).enableRLS();

export const cushScorePolicyVersions = pgTable("cush_score_policy_versions", {
  id: serial("id").primaryKey(),
  version: integer("version").notNull(),
  status: text("status").notNull().default("draft"),
  configuration: jsonb("configuration").$type<unknown>().notNull(),
  createdBy: integer("created_by").notNull().references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  statusCheck: check("cush_score_policy_versions_status_check", sql`${table.status} in ('draft', 'active', 'archived')`),
  versionUnique: unique("cush_score_policy_versions_version_unique").on(table.version),
  statusIndex: index("cush_score_policy_versions_status_idx").on(table.status),
  oneActivePolicy: uniqueIndex("cush_score_policy_versions_one_active_idx")
    .on(table.status)
    .where(sql`${table.status} = 'active'`),
  oneDraftPolicy: uniqueIndex("cush_score_policy_versions_one_draft_idx")
    .on(table.status)
    .where(sql`${table.status} = 'draft'`),
})).enableRLS();

// ─── Financial Signals ────────────────────────────────────────────────────────

export const financialSignals = pgTable("financial_signals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  passportId: integer("passport_id").notNull().references(() => passports.id, { onDelete: "cascade" }),
  signalType: text("signal_type").notNull(),
  label: text("label").notNull(),
  rawAmountCents: bigint("raw_amount_cents", { mode: "number" }).notNull(),
  currencyCode: text("currency_code").notNull(),
  normalizedValue: decimal("normalized_value", { precision: 10, scale: 4 }),
  country: text("country").notNull(),
  verificationStatus: text("verification_status").notNull().default("SELF_REPORTED"),
  period: text("period").default("monthly"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}).enableRLS();

// ─── Evidence Vault ───────────────────────────────────────────────────────────

export const evidenceVault = pgTable("evidence_vault", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  passportId: integer("passport_id").notNull().references(() => passports.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull().default("SELF_REPORTED"),
  tier: integer("tier").notNull().default(1),
  // Legacy metadata retained for compatibility; V2 never adds document points.
  scoreBoost: integer("score_boost").notNull().default(0),
  fileData: text("file_data"),
  fileName: text("file_name"),
  adminNotes: text("admin_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}).enableRLS();

// ─── Relations ────────────────────────────────────────────────────────────────

export const passportsRelations = relations(passports, ({ one, many }) => ({
  user: one(users, { fields: [passports.userId], references: [users.id] }),
  signals: many(financialSignals),
  evidence: many(evidenceVault),
}));

export const financialSignalsRelations = relations(financialSignals, ({ one }) => ({
  user: one(users, { fields: [financialSignals.userId], references: [users.id] }),
  passport: one(passports, { fields: [financialSignals.passportId], references: [passports.id] }),
}));

export const evidenceVaultRelations = relations(evidenceVault, ({ one }) => ({
  user: one(users, { fields: [evidenceVault.userId], references: [users.id] }),
  passport: one(passports, { fields: [evidenceVault.passportId], references: [passports.id] }),
}));

// ─── Insert Schemas ───────────────────────────────────────────────────────────

export const insertPassportSchema = createInsertSchema(passports).omit({
  id: true, createdAt: true, lastUpdated: true, generatedAt: true,
});
export const insertFinancialSignalSchema = createInsertSchema(financialSignals).omit({
  id: true, createdAt: true, updatedAt: true, normalizedValue: true,
});
export const insertEvidenceVaultSchema = createInsertSchema(evidenceVault).omit({
  id: true, createdAt: true, updatedAt: true, reviewedAt: true,
});

// ─── Passport API Schemas ─────────────────────────────────────────────────────

export const addSignalSchema = z.object({
  signalType: z.enum(["income", "surplus", "transfer", "stability"]),
  label: z.string().min(1),
  rawAmountCents: z.number().int().positive(),
  currencyCode: z.string().length(3),
  country: z.string().min(2),
  period: z.enum(["monthly", "annual"]).default("monthly"),
});

export const addEvidenceSchema = z.object({
  documentType: z.enum(["payslip", "bank_statement", "proof_of_residency", "tax_return", "employment_contract", "transfer_receipt"]),
  label: z.string().min(1),
  tier: z.number().int().min(1).max(2),
  fileData: z.string().optional(),
  fileName: z.string().optional(),
});

export const updatePassportModeSchema = z.object({
  mode: z.enum(["pre_arrival", "post_arrival"]),
});

const v2MonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must use YYYY-MM format.");
const v2PositivePenceSchema = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const v2NonNegativePenceSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);
const v2UuidSchema = z.string().uuid();

export const v2AssessmentInputSchema = z.object({
  selectedBaselineId: v2UuidSchema.nullable(),
  availableFunds: z.array(z.object({
    id: v2UuidSchema,
    label: z.string().trim().min(1).max(100),
    deduplicationKey: z.string().trim().min(1).max(120),
    amountPence: v2PositivePenceSchema,
    currencyCode: z.literal("GBP"),
    accessible: z.boolean(),
  }).strict()).max(100),
  incomeHistory: z.array(z.object({
    id: v2UuidSchema,
    month: v2MonthSchema,
    sourceId: z.string().trim().min(1).max(100),
    category: z.enum(["salary", "self_employment", "freelance", "business", "scholarship", "family_support", "other"]),
    amountPence: v2NonNegativePenceSchema,
    recurring: z.boolean(),
    variable: z.boolean(),
  }).strict()).max(72),
  cashFlowHistory: z.array(z.object({
    id: v2UuidSchema,
    month: v2MonthSchema,
    eligibleRecurringIncomePence: v2NonNegativePenceSchema,
    eligibleExpensesPence: v2NonNegativePenceSchema,
    complete: z.boolean(),
  }).strict()).max(12),
  creditClassification: z.enum(["strong", "average", "poor", "thin_file", "no_history", "incomplete", "unavailable"]),
}).strict().superRefine((value, context) => {
  const fundKeys = new Set<string>();
  for (const fund of value.availableFunds) {
    const key = fund.deduplicationKey.toLowerCase();
    if (fundKeys.has(key)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["availableFunds"], message: "Use a unique label for each funds source to avoid double counting." });
      break;
    }
    fundKeys.add(key);
  }
  const cashFlowMonths = new Set<string>();
  for (const row of value.cashFlowHistory) {
    if (cashFlowMonths.has(row.month)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["cashFlowHistory"], message: "Only one cash-flow record per month is allowed." });
      break;
    }
    cashFlowMonths.add(row.month);
  }
  const incomeObservations = new Set<string>();
  const incomeVariability = new Map<string, boolean>();
  const currentMonth = new Date().toISOString().slice(0, 7);
  for (const row of value.incomeHistory) {
    const key = `${row.sourceId.toLowerCase()}:${row.month}`;
    if (row.month > currentMonth) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["incomeHistory"], message: "Income records cannot be in a future month." });
      break;
    }
    if (incomeObservations.has(key)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["incomeHistory"], message: "Only one income record per source and month is allowed." });
      break;
    }
    incomeObservations.add(key);
    const previousVariability = incomeVariability.get(row.sourceId);
    if (previousVariability !== undefined && previousVariability !== row.variable) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["incomeHistory"], message: "Keep the income source's variable setting consistent across months." });
      break;
    }
    incomeVariability.set(row.sourceId, row.variable);
  }
  for (const row of value.cashFlowHistory) {
    if (row.month > currentMonth) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["cashFlowHistory"], message: "Cash-flow records cannot be in a future month." });
      break;
    }
  }
});

const scoreRangeSchema = z.number().finite().min(0).max(100);

export const destinationBaselineConfigSchema = z.object({
  id: v2UuidSchema,
  destination: z.string().trim().min(1).max(100),
  monthlyBaselinePence: v2PositivePenceSchema,
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  countryCode: z.literal("GB"),
  currencyCode: z.literal("GBP"),
  provenance: z.string().trim().min(1).max(500),
}).strict();

export const cushScorePolicyConfigSchema = z.object({
  destinationBaselines: z.array(destinationBaselineConfigSchema).min(1).max(50),
  creditMappings: z.object({
    strong: scoreRangeSchema.optional(),
    average: scoreRangeSchema.optional(),
    poor: scoreRangeSchema.optional(),
    no_history: scoreRangeSchema.optional(),
  }).strict(),
  confidence: z.object({
    historyMonthsForMaximum: z.literal(6),
    sourceQualityPoints: z.object({
      bank_connection: z.literal(25),
      verified_statement: z.literal(15),
      self_reported: z.literal(0),
    }).strict(),
    creditCheckPoints: z.object({
      matched: z.literal(15),
      matched_thin: z.literal(10),
      no_match: z.literal(5),
      not_done: z.literal(0),
    }).strict(),
    incomeSourcePoints: z.object({
      uk_payslip_or_uk_credits: z.literal(10),
      steady_employer: z.literal(8),
      variable: z.literal(5),
      uk_offer_only: z.literal(4),
      family_support_only: z.literal(3),
      other: z.literal(0),
    }).strict(),
    freshnessBands: z.tuple([
      z.object({ maxAgeDays: z.literal(7), points: z.literal(10) }).strict(),
      z.object({ maxAgeDays: z.literal(30), points: z.literal(6) }).strict(),
      z.object({ maxAgeDays: z.literal(90), points: z.literal(3) }).strict(),
    ]),
  }).strict(),
}).strict().superRefine((configuration, context) => {
  const baselineIds = new Set<string>();
  for (const baseline of configuration.destinationBaselines) {
    if (baselineIds.has(baseline.id)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["destinationBaselines"], message: "Destination baseline IDs must be unique." });
      break;
    }
    baselineIds.add(baseline.id);
    const date = new Date(`${baseline.effectiveDate}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== baseline.effectiveDate) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["destinationBaselines"], message: "Each baseline needs a valid effective date." });
      break;
    }
  }
});

export type V2AssessmentInput = z.infer<typeof v2AssessmentInputSchema>;
export type CushScorePolicyConfig = z.infer<typeof cushScorePolicyConfigSchema>;

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phoneNumber: z.string().optional(),
  nationality: z.string().optional(),
  acceptTerms: z.boolean().refine((v) => v === true, { message: "Must accept terms" }),
  acceptPrivacy: z.boolean().refine((v) => v === true, { message: "Must accept privacy policy" }),
  marketingConsent: z.boolean().optional(),
});

export const loginSchema = z.object({
  email: z.string().optional(),
  username: z.string().optional(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  nationality: z.string().optional(),
  profilePicture: z.string().optional(),
});

export const passwordRecoverySchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type Passport = typeof passports.$inferSelect;
export type InsertPassport = z.infer<typeof insertPassportSchema>;
export type FinancialSignal = typeof financialSignals.$inferSelect;
export type InsertFinancialSignal = z.infer<typeof insertFinancialSignalSchema>;
export type EvidenceItem = typeof evidenceVault.$inferSelect;
export type InsertEvidenceItem = z.infer<typeof insertEvidenceVaultSchema>;
export type AddSignal = z.infer<typeof addSignalSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
