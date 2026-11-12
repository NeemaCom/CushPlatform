import { pgTable, text, serial, integer, decimal, timestamp, boolean, json, jsonb, bigint, date, check, index, primaryKey, unique, uniqueIndex, uuid, foreignKey } from "drizzle-orm/pg-core";
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
  isActive: boolean("is_active").notNull().default(true),
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

export const cushLoginAttempts = pgTable("cush_login_attempts", {
  email: text("email").primaryKey(),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
  permanentlyLocked: boolean("permanently_locked").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  failedAttemptsCheck: check(
    "cush_login_attempts_failed_attempts_check",
    sql`${table.failedAttempts} between 0 and 5`,
  ),
  normalizedEmailCheck: check(
    "cush_login_attempts_normalized_email_check",
    sql`${table.email} = lower(btrim(${table.email}))`,
  ),
  lockedUntilIndex: index("cush_login_attempts_locked_until_idx").on(table.lockedUntil),
})).enableRLS();

export const cushIpRateLimits = pgTable("cush_ip_rate_limits", {
  scope: text("scope").notNull(),
  ipHash: text("ip_hash").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true, mode: "date" }).notNull(),
  requestCount: integer("request_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  primaryKey: primaryKey({ name: "cush_ip_rate_limits_pkey", columns: [table.scope, table.ipHash] }),
  scopeCheck: check(
    "cush_ip_rate_limits_scope_check",
    sql`${table.scope} in ('auth', 'password-signin')`,
  ),
  ipHashCheck: check(
    "cush_ip_rate_limits_ip_hash_check",
    sql`${table.ipHash} ~ '^[a-f0-9]{64}$'`,
  ),
  requestCountCheck: check(
    "cush_ip_rate_limits_request_count_check",
    sql`${table.requestCount} >= 0`,
  ),
  updatedAtIndex: index("cush_ip_rate_limits_updated_at_idx").on(table.updatedAt),
})).enableRLS();

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  action: text("action").notNull(),
  resourceType: text("resource_type"),
  resourceId: text("resource_id"),
  outcome: text("outcome").notNull().default("success"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  outcomeCheck: check(
    "admin_audit_logs_outcome_check",
    sql`${table.outcome} in ('success', 'denied', 'failed')`,
  ),
  adminCreatedAtIndex: index("admin_audit_logs_admin_created_at_idx").on(table.adminUserId, table.createdAt),
  createdAtIndex: index("admin_audit_logs_created_at_idx").on(table.createdAt),
})).enableRLS();

export const cushAnalyticsConsents = pgTable("cush_analytics_consents", {
  visitorId: uuid("visitor_id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  policyVersion: text("policy_version").notNull(),
  status: text("status").$type<"accepted" | "withdrawn">().notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }),
  withdrawnAt: timestamp("withdrawn_at", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  statusCheck: check(
    "cush_analytics_consents_status_check",
    sql`${table.status} in ('accepted', 'withdrawn')`,
  ),
  choiceTimestampsCheck: check(
    "cush_analytics_consents_timestamps_check",
    sql`(${table.status} = 'accepted' and ${table.acceptedAt} is not null and ${table.withdrawnAt} is null)
      or (${table.status} = 'withdrawn' and ${table.withdrawnAt} is not null)`,
  ),
  consentUserUpdatedIndex: index("cush_analytics_consents_user_updated_idx").on(table.userId, table.updatedAt),
})).enableRLS();

export const cushVisitorSessions = pgTable("cush_visitor_sessions", {
  visitorId: uuid("visitor_id").notNull(),
  sessionId: uuid("session_id").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  entryRoute: text("entry_route").notNull(),
  currentRoute: text("current_route").notNull(),
  deviceType: text("device_type").notNull(),
  browser: text("browser").notNull(),
  operatingSystem: text("operating_system").notNull(),
  referrerHost: text("referrer_host"),
  countryCode: text("country_code"),
}, (table) => ({
  primaryKey: primaryKey({
    name: "cush_visitor_sessions_pkey",
    columns: [table.visitorId, table.sessionId],
  }),
  deviceTypeCheck: check(
    "cush_visitor_sessions_device_type_check",
    sql`${table.deviceType} in ('mobile', 'tablet', 'desktop', 'unknown')`,
  ),
  countryCodeCheck: check(
    "cush_visitor_sessions_country_code_check",
    sql`${table.countryCode} is null or ${table.countryCode} ~ '^[A-Z]{2}$'`,
  ),
  visitorLastSeenIndex: index("cush_visitor_sessions_visitor_last_seen_idx").on(table.visitorId, table.lastSeenAt),
  userLastSeenIndex: index("cush_visitor_sessions_user_last_seen_idx").on(table.userId, table.lastSeenAt),
  lastSeenIndex: index("cush_visitor_sessions_last_seen_idx").on(table.lastSeenAt),
  currentRouteIndex: index("cush_visitor_sessions_current_route_idx").on(table.currentRoute),
  countryLastSeenIndex: index("cush_visitor_sessions_country_last_seen_idx")
    .on(table.countryCode, table.lastSeenAt)
    .where(sql`${table.countryCode} is not null`),
})).enableRLS();

export const cushVisitorEvents = pgTable("cush_visitor_events", {
  id: serial("id").primaryKey(),
  visitorId: uuid("visitor_id").notNull(),
  sessionId: uuid("session_id").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  route: text("route").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  eventTypeCheck: check(
    "cush_visitor_events_type_check",
    sql`${table.eventType} in ('page_view', 'signup_started', 'signup_completed', 'login_completed', 'session_ping')`,
  ),
  eventSessionForeignKey: foreignKey({
    name: "cush_visitor_events_session_fk",
    columns: [table.visitorId, table.sessionId],
    foreignColumns: [cushVisitorSessions.visitorId, cushVisitorSessions.sessionId],
  }).onDelete("cascade"),
  visitorOccurredIndex: index("cush_visitor_events_visitor_occurred_idx").on(table.visitorId, table.occurredAt),
  userOccurredIndex: index("cush_visitor_events_user_occurred_idx").on(table.userId, table.occurredAt),
  sessionOccurredIndex: index("cush_visitor_events_session_occurred_idx").on(table.sessionId, table.occurredAt),
  routeOccurredIndex: index("cush_visitor_events_route_occurred_idx").on(table.route, table.occurredAt),
  occurredIndex: index("cush_visitor_events_occurred_idx").on(table.occurredAt),
})).enableRLS();

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

export const cushVerifyInstitutionInterests = pgTable("cush_verify_institution_interests", {
  id: serial("id").primaryKey(),
  institutionName: text("institution_name").notNull(),
  institutionType: text("institution_type").notNull(),
  contactName: text("contact_name").notNull(),
  jobTitle: text("job_title").notNull(),
  email: text("email").notNull(),
  country: text("country").notNull(),
  intendedUse: text("intended_use"),
  verificationRequirements: text("verification_requirements"),
  preferredEngagementModel: text("preferred_engagement_model"),
  contactConsentAcceptedAt: timestamp("contact_consent_accepted_at", { withTimezone: true, mode: "date" }).notNull(),
  status: text("status").notNull().default("pending_review"),
  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  institutionTypeCheck: check(
    "cush_verify_institution_interests_type_check",
    sql`${table.institutionType} in ('bank', 'lender', 'housing', 'employer', 'university', 'other')`,
  ),
  engagementModelCheck: check(
    "cush_verify_institution_interests_engagement_model_check",
    sql`${table.preferredEngagementModel} in ('institutional_portal', 'api_integration', 'partnership_discussion')`,
  ),
  verificationRequirementsLengthCheck: check(
    "cush_verify_institution_interests_verification_requirements_length_check",
    sql`${table.verificationRequirements} is null or char_length(${table.verificationRequirements}) <= 1200`,
  ),
  statusCheck: check(
    "cush_verify_institution_interests_status_check",
    sql`${table.status} in ('pending_review', 'in_review', 'approved_for_follow_up', 'not_approved')`,
  ),
  statusCreatedIndex: index("cush_verify_institution_interests_status_created_idx").on(table.status, table.createdAt),
  emailIndex: index("cush_verify_institution_interests_email_idx").on(table.email),
})).enableRLS();

// Institutional identities are deliberately separate from Cush Passport users.
// Authentication is provided by a dedicated Firebase project; no password is
// stored in this application database.
export const cushVerifyApplications = pgTable("cush_verify_applications", {
  id: serial("id").primaryKey(),
  legalName: text("legal_name").notNull(),
  tradingName: text("trading_name"),
  institutionType: text("institution_type").notNull(),
  countryOfRegistration: text("country_of_registration").notNull(),
  website: text("website").notNull(),
  businessEmail: text("business_email").notNull(),
  normalizedBusinessEmail: text("normalized_business_email").notNull(),
  duplicateKey: text("duplicate_key").notNull(),
  contactFullName: text("contact_full_name").notNull(),
  contactJobTitle: text("contact_job_title").notNull(),
  businessTelephone: text("business_telephone").notNull(),
  intendedUse: text("intended_use").notNull(),
  estimatedMonthlyVerifications: integer("estimated_monthly_verifications"),
  contactConsentAcceptedAt: timestamp("contact_consent_accepted_at", { withTimezone: true, mode: "date" }).notNull(),
  status: text("status").notNull().default("submitted"),
  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  typeCheck: check(
    "cush_verify_applications_type_check",
    sql`${table.institutionType} in ('university', 'housing_organisation', 'bank', 'landlord')`,
  ),
  statusCheck: check(
    "cush_verify_applications_status_check",
    sql`${table.status} in ('submitted', 'under_review', 'additional_information_required', 'approved', 'rejected')`,
  ),
  monthlyVerificationsCheck: check(
    "cush_verify_applications_monthly_verifications_check",
    sql`${table.estimatedMonthlyVerifications} is null or ${table.estimatedMonthlyVerifications} between 0 and 10000000`,
  ),
  emailActiveUnique: uniqueIndex("cush_verify_applications_business_email_active_uq")
    .on(table.normalizedBusinessEmail)
    .where(sql`${table.status} <> 'rejected'`),
  duplicateActiveUnique: uniqueIndex("cush_verify_applications_duplicate_active_uq")
    .on(table.duplicateKey)
    .where(sql`${table.status} <> 'rejected'`),
  statusCreatedIndex: index("cush_verify_applications_status_created_idx").on(table.status, table.createdAt),
})).enableRLS();

export const cushVerifyInstitutions = pgTable("cush_verify_institutions", {
  id: serial("id").primaryKey(),
  sourceApplicationId: integer("source_application_id").notNull()
    .references(() => cushVerifyApplications.id, { onDelete: "restrict" }).unique(),
  legalName: text("legal_name").notNull(),
  tradingName: text("trading_name"),
  institutionType: text("institution_type").notNull(),
  countryOfRegistration: text("country_of_registration").notNull(),
  website: text("website").notNull(),
  businessEmail: text("business_email").notNull(),
  normalizedBusinessEmail: text("normalized_business_email").notNull(),
  duplicateKey: text("duplicate_key").notNull(),
  status: text("status").notNull().default("pending_approval"),
  approvedBy: integer("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  statusCheck: check(
    "cush_verify_institutions_status_check",
    sql`${table.status} in ('pending_approval', 'approved', 'rejected', 'suspended')`,
  ),
  typeCheck: check(
    "cush_verify_institutions_type_check",
    sql`${table.institutionType} in ('university', 'housing_organisation', 'bank', 'landlord')`,
  ),
  legalCountryUnique: uniqueIndex("cush_verify_institutions_legal_country_uq")
    .on(table.duplicateKey)
    .where(sql`${table.status} <> 'rejected'`),
  businessEmailUnique: uniqueIndex("cush_verify_institutions_business_email_uq")
    .on(table.normalizedBusinessEmail)
    .where(sql`${table.status} <> 'rejected'`),
})).enableRLS();

export const cushVerifyInstitutionalUsers = pgTable("cush_verify_institutional_users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  jobTitle: text("job_title").notNull(),
  businessTelephone: text("business_telephone").notNull(),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}).enableRLS();

export const cushVerifyInvitations = pgTable("cush_verify_invitations", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "cascade" }),
  applicationId: integer("application_id").notNull()
    .references(() => cushVerifyApplications.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  fullName: text("full_name").notNull(),
  jobTitle: text("job_title").notNull(),
  businessTelephone: text("business_telephone").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  institutionCreatedIndex: index("cush_verify_invitations_institution_created_idx")
    .on(table.institutionId, table.createdAt),
  inviteEmailIndex: index("cush_verify_invitations_email_idx").on(table.email),
})).enableRLS();

export const cushVerifyInstitutionalMemberships = pgTable("cush_verify_institutional_memberships", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "cascade" }),
  institutionalUserId: integer("institutional_user_id").notNull()
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("organisation_admin"),
  status: text("status").notNull().default("pending_approval"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  roleCheck: check(
    "cush_verify_memberships_role_check",
    sql`${table.role} in ('organisation_admin', 'analyst', 'viewer')`,
  ),
  statusCheck: check(
    "cush_verify_memberships_status_check",
    sql`${table.status} in ('pending_approval', 'active', 'suspended', 'revoked')`,
  ),
  institutionUserUnique: unique("cush_verify_memberships_institution_user_uq")
    .on(table.institutionId, table.institutionalUserId),
  userStatusIndex: index("cush_verify_memberships_user_status_idx")
    .on(table.institutionalUserId, table.status),
})).enableRLS();

export const cushVerifyApplicationEvents = pgTable("cush_verify_application_events", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull()
    .references(() => cushVerifyApplications.id, { onDelete: "cascade" }),
  institutionId: integer("institution_id")
    .references(() => cushVerifyInstitutions.id, { onDelete: "set null" }),
  actorAdminId: integer("actor_admin_id").references(() => users.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  eventTypeCheck: check(
    "cush_verify_application_events_type_check",
    sql`${table.eventType} in ('submitted', 'status_changed', 'organisation_onboarded', 'invitation_created', 'invitation_sent', 'invitation_delivery_failed', 'invitation_accepted', 'approved', 'rejected')`,
  ),
  applicationCreatedIndex: index("cush_verify_application_events_application_created_idx")
    .on(table.applicationId, table.createdAt),
})).enableRLS();

export const insertUserSchema = createInsertSchema(users).omit({
  id: true, createdAt: true, updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type SafeUser = Omit<
  User,
  "passwordHash" | "passwordResetToken" | "passwordResetExpires" | "isActive"
>;

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

// ─── Post-Arrival Profile ─────────────────────────────────────────────────────

export const cushPostArrivalProfiles = pgTable("cush_post_arrival_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  arrivalStatus: text("arrival_status").notNull().default("awaiting_arrival"),
  arrivalDate: date("arrival_date"),
  arrivalConfirmedAt: timestamp("arrival_confirmed_at", { withTimezone: true, mode: "date" }),
  profileData: jsonb("profile_data").$type<unknown>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  statusCheck: check(
    "cush_post_arrival_profiles_status_check",
    sql`${table.arrivalStatus} in ('awaiting_arrival', 'arrived')`,
  ),
  arrivedDateCheck: check(
    "cush_post_arrival_profiles_arrived_date_check",
    sql`(${table.arrivalStatus} <> 'arrived') or ${table.arrivalDate} is null or ${table.arrivalDate} <= CURRENT_DATE`,
  ),
  statusIndex: index("cush_post_arrival_profiles_status_idx").on(table.arrivalStatus),
})).enableRLS();

export const cushPlaidConnections = pgTable("cush_plaid_connections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  plaidItemId: text("plaid_item_id").notNull().unique(),
  institutionName: text("institution_name"),
  accessTokenCiphertext: text("access_token_ciphertext").notNull(),
  accessTokenIv: text("access_token_iv").notNull(),
  accessTokenAuthTag: text("access_token_auth_tag").notNull(),
  identityConsentAcceptedAt: timestamp("identity_consent_accepted_at", { withTimezone: true, mode: "date" }).notNull(),
  transactionsConsentAcceptedAt: timestamp("transactions_consent_accepted_at", { withTimezone: true, mode: "date" }).notNull(),
  linkedAt: timestamp("linked_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userLinkedAtIndex: index("cush_plaid_connections_user_linked_at_idx").on(table.userId, table.linkedAt),
})).enableRLS();

export const cushPostArrivalRecords = pgTable("cush_post_arrival_records", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  recordType: text("record_type").notNull(),
  label: text("label").notNull(),
  details: jsonb("details").$type<unknown>().notNull(),
  activityDate: date("activity_date"),
  countryCode: text("country_code").notNull().default("GB"),
  currencyCode: text("currency_code").notNull().default("GBP"),
  evidenceStatus: text("evidence_status").notNull().default("user_recorded"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  typeCheck: check(
    "cush_post_arrival_records_type_check",
    sql`${table.recordType} in ('employment', 'income', 'accommodation', 'banking_savings', 'expense', 'financial_activity', 'other_change')`,
  ),
  countryCodeCheck: check("cush_post_arrival_records_country_check", sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
  currencyCodeCheck: check("cush_post_arrival_records_currency_check", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
  evidenceStatusCheck: check(
    "cush_post_arrival_records_evidence_status_check",
    sql`${table.evidenceStatus} in ('user_recorded', 'pending_review', 'document_supported', 'independently_verified', 'disputed_or_rejected')`,
  ),
  userDateIndex: index("cush_post_arrival_records_user_date_idx").on(table.userId, table.activityDate),
  userTypeIndex: index("cush_post_arrival_records_user_type_idx").on(table.userId, table.recordType),
})).enableRLS();

export const cushPostArrivalAuditLogs = pgTable("cush_post_arrival_audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userCreatedAtIndex: index("cush_post_arrival_audit_user_created_at_idx").on(table.userId, table.createdAt),
})).enableRLS();

// ─── Cush Score V2 Inputs and Policy ──────────────────────────────────────────

export const cushAssessmentInputs = pgTable("cush_assessment_inputs", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  inputData: jsonb("input_data").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}).enableRLS();

export const monoLinkedAccounts = pgTable("mono_linked_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  monoAccountId: text("mono_account_id").notNull().unique(),
  linkedAt: timestamp("linked_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userIdIndex: index("mono_linked_accounts_user_id_idx").on(table.userId),
})).enableRLS();

export const monoBvnLookupConsents = pgTable("mono_bvn_lookup_consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentVersion: text("consent_version").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userAcceptedAtIndex: index("mono_bvn_lookup_consents_user_accepted_at_idx").on(table.userId, table.acceptedAt),
})).enableRLS();

export const interswitchCreditLookupConsents = pgTable("interswitch_credit_lookup_consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentVersion: text("consent_version").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userAcceptedAtIndex: index("interswitch_credit_lookup_consents_user_accepted_at_idx").on(table.userId, table.acceptedAt),
})).enableRLS();

export const interswitchCreditHistoryEvidence = pgTable("interswitch_credit_history_evidence", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  consentId: integer("consent_id").notNull()
    .references(() => interswitchCreditLookupConsents.id, { onDelete: "cascade" }),
  evidenceData: jsonb("evidence_data").$type<unknown>().notNull(),
  mappingStatus: text("mapping_status").notNull().default("draft_pending_review"),
  mappingVersion: text("mapping_version").notNull().default("interswitch-repayment-history-v1"),
  fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userIdUnique: uniqueIndex("interswitch_credit_history_evidence_user_id_key").on(table.userId),
  userFetchedAtIndex: index("interswitch_credit_history_evidence_user_fetched_at_idx")
    .on(table.userId, table.fetchedAt),
})).enableRLS();

export const monoV2AssessmentEvidence = pgTable("mono_v2_assessment_evidence", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  monoLinkedAccountId: integer("mono_linked_account_id").notNull()
    .references(() => monoLinkedAccounts.id, { onDelete: "cascade" }).unique(),
  evidenceData: jsonb("evidence_data").$type<unknown>().notNull(),
  statementPeriodMonths: integer("statement_period_months").notNull(),
  consentVersion: text("consent_version").notNull(),
  consentAcceptedAt: timestamp("consent_accepted_at", { withTimezone: true, mode: "date" }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  userIdIndex: index("mono_v2_assessment_evidence_user_id_idx").on(table.userId),
})).enableRLS();

export const cushEvidenceFreshnessReviews = pgTable("cush_evidence_freshness_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  monoEvidenceId: integer("mono_evidence_id")
    .references(() => monoV2AssessmentEvidence.id, { onDelete: "cascade" }),
  creditEvidenceId: integer("credit_evidence_id")
    .references(() => interswitchCreditHistoryEvidence.id, { onDelete: "cascade" }),
  decision: text("decision").notNull(),
  confirmedSourceDate: date("confirmed_source_date"),
  evidenceFetchedAt: timestamp("evidence_fetched_at", { withTimezone: true, mode: "date" }).notNull(),
  reviewedBy: integer("reviewed_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  decisionCheck: check(
    "cush_evidence_freshness_reviews_decision_check",
    sql`${table.decision} in ('confirm_source_date', 'confirm_retrieval_date')`,
  ),
  targetCheck: check(
    "cush_evidence_freshness_reviews_target_check",
    sql`(${table.monoEvidenceId} is null) <> (${table.creditEvidenceId} is null)`,
  ),
  sourceDateCheck: check(
    "cush_evidence_freshness_reviews_source_date_check",
    sql`(${table.decision} = 'confirm_source_date' and ${table.confirmedSourceDate} is not null) or
      (${table.decision} = 'confirm_retrieval_date' and ${table.confirmedSourceDate} is null)`,
  ),
  monoEvidenceUnique: uniqueIndex("cush_evidence_freshness_reviews_mono_evidence_key")
    .on(table.monoEvidenceId).where(sql`${table.monoEvidenceId} is not null`),
  creditEvidenceUnique: uniqueIndex("cush_evidence_freshness_reviews_credit_evidence_key")
    .on(table.creditEvidenceId).where(sql`${table.creditEvidenceId} is not null`),
  userReviewedAtIndex: index("cush_evidence_freshness_reviews_user_reviewed_at_idx")
    .on(table.userId, table.reviewedAt),
})).enableRLS();

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

const postArrivalDateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD dates.")
  .refine((value) => Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value, "Enter a valid calendar date.");
const postArrivalMoneySchema = z.string()
  .regex(/^\d{1,15}(?:\.\d{1,4})?$/, "Enter a positive amount using up to four decimal places.")
  .refine((value) => Number.isFinite(Number(value)), "Amount is too large.");
const postArrivalPositiveMoneySchema = postArrivalMoneySchema.refine((value) => Number(value) > 0, "Amount must be greater than zero.");
const postArrivalCommonRecordSchema = {
  label: z.string().trim().min(1).max(120),
  activityDate: postArrivalDateSchema.nullable().optional(),
  countryCode: z.string().regex(/^[A-Z]{2}$/).default("GB"),
  currencyCode: z.string().regex(/^[A-Z]{3}$/).default("GBP"),
};

export const postArrivalProfileDataSchema = z.object({
  currentLocation: z.string().trim().max(160).nullable().optional(),
  accountHolderName: z.string().trim().max(160).nullable().optional(),
  accountHolderEmail: z.string().trim().email().max(254).nullable().optional(),
  accountHolderPhone: z.string().trim().max(40).nullable().optional(),
  accommodationArrangement: z.enum([
    "private_rent", "family_or_friends", "temporary", "student", "owned", "other",
  ]).nullable().optional(),
  employmentStatus: z.enum([
    "employed", "self_employed", "freelance", "seeking_work", "studying", "not_working", "other",
  ]).nullable().optional(),
  startedWorking: z.boolean().nullable().optional(),
  studying: z.boolean().nullable().optional(),
  changesSinceArrival: z.string().trim().max(1000).nullable().optional(),
}).strict();

export const postArrivalRecordSchema = z.discriminatedUnion("recordType", [
  z.object({
    ...postArrivalCommonRecordSchema,
    recordType: z.literal("employment"),
    details: z.object({
      employer: z.string().trim().max(160).nullable().optional(),
      employmentType: z.enum(["permanent", "fixed_term", "part_time", "self_employed", "freelance", "other"]),
      jobTitle: z.string().trim().max(120).nullable().optional(),
      startDate: postArrivalDateSchema.nullable().optional(),
      salaryAmount: postArrivalMoneySchema.nullable().optional(),
      salaryFrequency: z.enum(["weekly", "fortnightly", "monthly", "annual", "irregular"]).nullable().optional(),
      salaryBasis: z.enum(["gross", "net", "unknown"]).nullable().optional(),
      firstSalaryDate: postArrivalDateSchema.nullable().optional(),
    }).strict(),
  }).strict(),
  z.object({
    ...postArrivalCommonRecordSchema,
    recordType: z.literal("income"),
    activityDate: postArrivalDateSchema,
    details: z.object({
      sourceType: z.enum(["salary", "self_employment", "freelance", "business", "scholarship", "family_support", "other"]),
      payer: z.string().trim().max(160).nullable().optional(),
      amount: postArrivalPositiveMoneySchema,
      paymentFrequency: z.enum(["one_off", "weekly", "fortnightly", "monthly", "annual", "irregular"]),
      grossOrNet: z.enum(["gross", "net", "unknown"]).optional(),
      note: z.string().trim().max(500).nullable().optional(),
    }).strict(),
  }).strict(),
  z.object({
    ...postArrivalCommonRecordSchema,
    recordType: z.literal("accommodation"),
    details: z.object({
      arrangementType: z.enum(["private_rent", "family_or_friends", "temporary", "student", "owned", "other"]),
      provider: z.string().trim().max(160).nullable().optional(),
      tenancyStartDate: postArrivalDateSchema.nullable().optional(),
      rentAmount: postArrivalMoneySchema.nullable().optional(),
      rentFrequency: z.enum(["weekly", "fortnightly", "monthly", "annual", "irregular"]).nullable().optional(),
      hasFormalTenancy: z.boolean().nullable().optional(),
    }).strict(),
  }).strict(),
  z.object({
    ...postArrivalCommonRecordSchema,
    recordType: z.literal("banking_savings"),
    details: z.object({
      institution: z.string().trim().max(160).nullable().optional(),
      availableSavings: postArrivalMoneySchema.nullable().optional(),
      balanceDate: postArrivalDateSchema.nullable().optional(),
      savingsActivity: z.string().trim().max(500).nullable().optional(),
    }).strict().refine((value) =>
      Boolean(value.institution?.trim() || value.availableSavings || value.savingsActivity?.trim()),
    "Add an institution, a savings balance, or a savings note."),
  }).strict(),
  z.object({
    ...postArrivalCommonRecordSchema,
    recordType: z.literal("expense"),
    details: z.object({
      category: z.enum(["food", "transport", "utilities", "internet_phone", "insurance", "subscription", "loan", "education", "other"]),
      amount: postArrivalPositiveMoneySchema,
      frequency: z.enum(["one_off", "weekly", "fortnightly", "monthly", "annual", "irregular"]),
      provider: z.string().trim().max(160).nullable().optional(),
      note: z.string().trim().max(500).nullable().optional(),
    }).strict(),
  }).strict(),
  z.object({
    ...postArrivalCommonRecordSchema,
    recordType: z.literal("financial_activity"),
    activityDate: postArrivalDateSchema,
    details: z.object({
      activityType: z.enum(["salary", "freelance_income", "rent_payment", "savings_contribution", "international_transfer", "remittance", "other"]),
      amount: postArrivalPositiveMoneySchema,
      counterparty: z.string().trim().max(160).nullable().optional(),
      note: z.string().trim().max(500).nullable().optional(),
    }).strict(),
  }).strict(),
  z.object({
    ...postArrivalCommonRecordSchema,
    recordType: z.literal("other_change"),
    details: z.object({
      description: z.string().trim().min(1).max(1000),
    }).strict(),
  }).strict(),
]);
export type PostArrivalRecordInput = z.infer<typeof postArrivalRecordSchema>;

export const confirmUkArrivalSchema = z.object({
  arrivalDate: postArrivalDateSchema,
}).strict();

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
  }).strict()).max(168),
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

export const monoV2AssessmentEvidenceSchema = z.object({
  fxRateSource: z.literal("https://www.cbn.gov.ng/api/GetAllExchangeRates?format=json"),
  fxRateDateBasis: z.literal("transaction_date"),
  sourceCurrencies: z.array(z.enum(["GBP", "USD", "NGN"])).min(1).max(3),
  availableFunds: z.array(z.object({
    id: v2UuidSchema,
    label: z.string().trim().min(1).max(100),
    deduplicationKey: z.string().trim().min(1).max(120),
    amountPence: v2PositivePenceSchema,
    currencyCode: z.literal("GBP"),
    accessible: z.boolean(),
  }).strict()).max(1),
  incomeHistory: z.array(z.object({
    id: v2UuidSchema,
    month: v2MonthSchema,
    sourceId: z.string().trim().min(1).max(120),
    category: z.enum(["salary", "self_employment", "freelance", "business", "scholarship", "family_support", "other"]),
    amountPence: v2NonNegativePenceSchema,
    recurring: z.literal(true),
    variable: z.boolean(),
  }).strict()).max(168),
  cashFlowHistory: z.array(z.object({
    id: v2UuidSchema,
    month: v2MonthSchema,
    eligibleRecurringIncomePence: v2NonNegativePenceSchema,
    eligibleExpensesPence: v2NonNegativePenceSchema,
    complete: z.boolean(),
  }).strict()).max(12),
  balanceAsOfDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  statementDataThroughDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  conversionAudit: z.array(z.object({
    source: z.literal("https://www.cbn.gov.ng/api/GetAllExchangeRates?format=json"),
    valueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) =>
      Number.isFinite(new Date(`${value}T00:00:00Z`).getTime()) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
    ),
    dateBasis: z.enum(["transaction_date", "balance_snapshot_date"]),
    rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) =>
      Number.isFinite(new Date(`${value}T00:00:00Z`).getTime()) &&
      new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value,
    ),
    currencyCode: z.enum(["USD", "NGN"]),
    usdNgnCentralRate: z.string().regex(/^\d+(?:\.\d{1,4})?$/),
    gbpNgnCentralRate: z.string().regex(/^\d+(?:\.\d{1,4})?$/),
  }).strict()).max(5000),
  statementPeriodMonths: z.number().int().min(1).max(12),
  fetchedAt: z.string().datetime(),
  consentVersion: z.literal("mono-v2-statement-assessment-v1"),
  consentAcceptedAt: z.string().datetime(),
}).strict();

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
export type MonoV2AssessmentEvidence = z.infer<typeof monoV2AssessmentEvidenceSchema>;
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
  marketingConsent: z.boolean().optional(),
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
