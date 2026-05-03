import { pgTable, text, serial, integer, decimal, timestamp, boolean, json, bigint } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firebaseUid: text("firebase_uid").unique(),
  role: text("role").default("customer"),
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
});

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
    incomeScore: number; surplusScore: number; stabilityScore: number;
  }>(),
  reasonCodes: text("reason_codes").array(),
  generatedAt: timestamp("generated_at"),
  lastUpdated: timestamp("last_updated").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
});

// ─── Evidence Vault ───────────────────────────────────────────────────────────

export const evidenceVault = pgTable("evidence_vault", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  passportId: integer("passport_id").notNull().references(() => passports.id, { onDelete: "cascade" }),
  documentType: text("document_type").notNull(),
  label: text("label").notNull(),
  status: text("status").notNull().default("SELF_REPORTED"),
  tier: integer("tier").notNull().default(1),
  scoreBoost: integer("score_boost").notNull().default(0),
  fileData: text("file_data"),
  fileName: text("file_name"),
  adminNotes: text("admin_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
