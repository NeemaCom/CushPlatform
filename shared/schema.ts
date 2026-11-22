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

// Cush Verify production uses a separate database. Numeric IDs that identify
// Passport users or admins are opaque references and must not be cross-database FKs.
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
  reviewedBy: integer("reviewed_by"),
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
  reviewedBy: integer("reviewed_by"),
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
  approvedBy: integer("approved_by"),
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
  businessTelephone: text("business_telephone"),
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
  businessTelephone: text("business_telephone"),
  role: text("role").notNull().default("organisation_admin"),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true, mode: "date" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  createdBy: integer("created_by").notNull(),
  createdByType: text("created_by_type").notNull().default("cush_admin"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  institutionCreatedIndex: index("cush_verify_invitations_institution_created_idx")
    .on(table.institutionId, table.createdAt),
  inviteEmailIndex: index("cush_verify_invitations_email_idx").on(table.email),
  roleCheck: check(
    "cush_verify_invitations_role_check",
    sql`${table.role} in ('organisation_admin', 'analyst', 'viewer')`,
  ),
  createdByTypeCheck: check(
    "cush_verify_invitations_created_by_type_check",
    sql`${table.createdByType} in ('cush_admin', 'organisation_admin')`,
  ),
})).enableRLS();

export const cushVerifyEmailActivations = pgTable("cush_verify_email_activations", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull()
    .references(() => cushVerifyApplications.id, { onDelete: "cascade" }),
  firebaseUid: text("firebase_uid").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  claimedAt: timestamp("claimed_at", { withTimezone: true, mode: "date" }),
  consumedAt: timestamp("consumed_at", { withTimezone: true, mode: "date" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  applicationCreatedIndex: index("cush_verify_email_activations_application_created_idx")
    .on(table.applicationId, table.createdAt),
  pendingApplicationUnique: uniqueIndex("cush_verify_email_activations_pending_application_uq")
    .on(table.applicationId)
    .where(sql`${table.consumedAt} is null and ${table.revokedAt} is null`),
  expiryCheck: check(
    "cush_verify_email_activations_expiry_check",
    sql`${table.expiresAt} > ${table.createdAt}`,
  ),
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

export const cushVerifyMembershipEvents = pgTable("cush_verify_membership_events", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "cascade" }),
  invitationId: integer("invitation_id")
    .references(() => cushVerifyInvitations.id, { onDelete: "set null" }),
  membershipId: integer("membership_id")
    .references(() => cushVerifyInstitutionalMemberships.id, { onDelete: "set null" }),
  actorType: text("actor_type").notNull(),
  actorInstitutionalUserId: integer("actor_institutional_user_id")
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "set null" }),
  actorAdminUserId: integer("actor_admin_user_id"),
  eventType: text("event_type").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  actorTypeCheck: check(
    "cush_verify_membership_events_actor_type_check",
    sql`${table.actorType} in ('organisation_admin', 'institutional_user', 'cush_admin', 'system')`,
  ),
  eventTypeCheck: check(
    "cush_verify_membership_events_type_check",
    sql`${table.eventType} in ('invitation_created', 'invitation_sent', 'invitation_delivery_failed', 'invitation_revoked', 'invitation_accepted', 'membership_role_changed', 'membership_suspended', 'membership_reactivated', 'membership_revoked')`,
  ),
  institutionCreatedIndex: index("cush_verify_membership_events_institution_created_idx")
    .on(table.institutionId, table.createdAt),
  membershipCreatedIndex: index("cush_verify_membership_events_membership_created_idx")
    .on(table.membershipId, table.createdAt),
})).enableRLS();

export const cushVerifyApplicationEvents = pgTable("cush_verify_application_events", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").notNull()
    .references(() => cushVerifyApplications.id, { onDelete: "cascade" }),
  institutionId: integer("institution_id")
    .references(() => cushVerifyInstitutions.id, { onDelete: "set null" }),
  actorAdminId: integer("actor_admin_id"),
  eventType: text("event_type").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  eventTypeCheck: check(
    "cush_verify_application_events_type_check",
    sql`${table.eventType} in ('submitted', 'status_changed', 'organisation_onboarded', 'invitation_created', 'invitation_sent', 'invitation_delivery_failed', 'invitation_accepted', 'activation_email_sent', 'activation_email_resent', 'activation_email_delivery_failed', 'account_activated', 'approved', 'rejected')`,
  ),
  applicationCreatedIndex: index("cush_verify_application_events_application_created_idx")
    .on(table.applicationId, table.createdAt),
})).enableRLS();

export type CushVerifyReportCategory =
  | "income_employment"
  | "rent_housing"
  | "savings"
  | "financial_commitments"
  | "score_summary"
  | "assessment_status"
  | "evidence_summary";

export const cushVerifyReportRequests = pgTable("cush_verify_report_requests", {
  id: uuid("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  requestedByInstitutionalUserId: integer("requested_by_institutional_user_id").notNull()
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "restrict" }),
  targetUserId: integer("target_user_id"),
  recipientEmailHash: text("recipient_email_hash"),
  invitationTokenHash: text("invitation_token_hash"),
  invitationExpiresAt: timestamp("invitation_expires_at", { withTimezone: true, mode: "date" }),
  recipientLabel: text("recipient_label").notNull(),
  purpose: text("purpose").notNull(),
  requestedCategories: text("requested_categories").array().$type<CushVerifyReportCategory[]>().notNull(),
  requestedAuthorizationDays: integer("requested_authorization_days").notNull(),
  status: text("status").$type<"awaiting_consent" | "authorized" | "declined" | "revoked" | "expired">()
    .notNull().default("awaiting_consent"),
  requestExpiresAt: timestamp("request_expires_at", { withTimezone: true, mode: "date" }).notNull(),
  authorizationExpiresAt: timestamp("authorization_expires_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  statusCheck: check(
    "cush_verify_report_requests_status_check",
    sql`${table.status} in ('awaiting_consent', 'authorized', 'declined', 'revoked', 'expired')`,
  ),
  purposeLengthCheck: check(
    "cush_verify_report_requests_purpose_length_check",
    sql`char_length(btrim(${table.purpose})) between 10 and 500`,
  ),
  categoryCheck: check(
    "cush_verify_report_requests_categories_check",
    sql`cardinality(${table.requestedCategories}) between 1 and 7
      and ${table.requestedCategories} <@ ARRAY['income_employment', 'rent_housing', 'savings', 'financial_commitments', 'score_summary', 'assessment_status', 'evidence_summary']::text[]`,
  ),
  authorizationDaysCheck: check(
    "cush_verify_report_requests_authorization_days_check",
    sql`${table.requestedAuthorizationDays} between 1 and 90`,
  ),
  recipientLabelLengthCheck: check(
    "cush_verify_report_requests_recipient_label_length_check",
    sql`char_length(${table.recipientLabel}) between 3 and 254`,
  ),
  recipientEmailHashCheck: check(
    "cush_verify_report_requests_recipient_email_hash_check",
    sql`${table.recipientEmailHash} is null or ${table.recipientEmailHash} ~ '^[a-f0-9]{64}$'`,
  ),
  invitationHashCheck: check(
    "cush_verify_report_requests_invitation_hash_check",
    sql`${table.invitationTokenHash} is null or (
      ${table.invitationTokenHash} ~ '^[a-f0-9]{64}$'
      and ${table.recipientEmailHash} is not null
      and ${table.invitationExpiresAt} is not null
      and ${table.invitationExpiresAt} > ${table.createdAt}
    )`,
  ),
  expiryCheck: check(
    "cush_verify_report_requests_expiry_check",
    sql`${table.requestExpiresAt} > ${table.createdAt}`,
  ),
  authorizationExpiryCheck: check(
    "cush_verify_report_requests_authorization_expiry_check",
    sql`(${table.status} = 'authorized' and ${table.authorizationExpiresAt} is not null)
      or (${table.status} <> 'authorized' and ${table.authorizationExpiresAt} is null)`,
  ),
  institutionStatusIndex: index("cush_verify_report_requests_institution_status_created_idx")
    .on(table.institutionId, table.status, table.createdAt),
  invitationTokenUnique: uniqueIndex("cush_verify_report_requests_invitation_token_uq")
    .on(table.invitationTokenHash)
    .where(sql`${table.invitationTokenHash} is not null`),
  invitationEmailIndex: index("cush_verify_report_requests_invitation_email_hash_idx")
    .on(table.recipientEmailHash, table.status),
  targetStatusIndex: index("cush_verify_report_requests_target_status_created_idx")
    .on(table.targetUserId, table.status, table.createdAt),
  requestedByIndex: index("cush_verify_report_requests_requested_by_created_idx")
    .on(table.requestedByInstitutionalUserId, table.createdAt),
})).enableRLS();

export const cushVerifyReportConsents = pgTable("cush_verify_report_consents", {
  id: serial("id").primaryKey(),
  requestId: uuid("request_id").notNull()
    .references(() => cushVerifyReportRequests.id, { onDelete: "cascade" }).unique(),
  userId: integer("user_id").notNull(),
  status: text("status").$type<"approved" | "declined" | "revoked">().notNull(),
  approvedCategories: text("approved_categories").array().$type<CushVerifyReportCategory[]>().notNull().default([]),
  approvedAt: timestamp("approved_at", { withTimezone: true, mode: "date" }),
  declinedAt: timestamp("declined_at", { withTimezone: true, mode: "date" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  statusCheck: check(
    "cush_verify_report_consents_status_check",
    sql`${table.status} in ('approved', 'declined', 'revoked')`,
  ),
  categoriesCheck: check(
    "cush_verify_report_consents_categories_check",
    sql`cardinality(${table.approvedCategories}) between 0 and 7
      and ${table.approvedCategories} <@ ARRAY['income_employment', 'rent_housing', 'savings', 'financial_commitments', 'score_summary', 'assessment_status', 'evidence_summary']::text[]`,
  ),
  decisionTimestampsCheck: check(
    "cush_verify_report_consents_timestamps_check",
    sql`(${table.status} = 'approved' and ${table.approvedAt} is not null and ${table.declinedAt} is null
        and ${table.revokedAt} is null and ${table.expiresAt} is not null and cardinality(${table.approvedCategories}) > 0)
      or (${table.status} = 'declined' and ${table.approvedAt} is null and ${table.declinedAt} is not null
        and ${table.revokedAt} is null and ${table.expiresAt} is null and cardinality(${table.approvedCategories}) = 0)
      or (${table.status} = 'revoked' and ${table.approvedAt} is not null and ${table.declinedAt} is null
        and ${table.revokedAt} is not null and ${table.expiresAt} is not null and cardinality(${table.approvedCategories}) > 0)`,
  ),
  userStatusIndex: index("cush_verify_report_consents_user_status_idx").on(table.userId, table.status),
  expiresAtIndex: index("cush_verify_report_consents_expires_at_idx").on(table.expiresAt),
})).enableRLS();

export const cushVerifyReportEvents = pgTable("cush_verify_report_events", {
  id: serial("id").primaryKey(),
  requestId: uuid("request_id").notNull()
    .references(() => cushVerifyReportRequests.id, { onDelete: "cascade" }),
  eventType: text("event_type").$type<
    "request_created" | "request_linked" | "consent_approved" | "consent_declined" | "consent_revoked" | "report_delivered" | "report_accessed"
  >().notNull(),
  actorType: text("actor_type").$type<"institutional_user" | "passport_user" | "system">().notNull(),
  actorUserId: integer("actor_user_id"),
  actorInstitutionalUserId: integer("actor_institutional_user_id")
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "set null" }),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  eventTypeCheck: check(
    "cush_verify_report_events_type_check",
    sql`${table.eventType} in ('request_created', 'request_linked', 'consent_approved', 'consent_declined', 'consent_revoked', 'report_delivered', 'report_accessed')`,
  ),
  actorTypeCheck: check(
    "cush_verify_report_events_actor_check",
    sql`(${table.actorType} = 'passport_user' and ${table.actorInstitutionalUserId} is null)
      or (${table.actorType} = 'institutional_user' and ${table.actorUserId} is null)
      or (${table.actorType} = 'system' and ${table.actorUserId} is null and ${table.actorInstitutionalUserId} is null)`,
  ),
  detailsObjectCheck: check(
    "cush_verify_report_events_details_object_check",
    sql`jsonb_typeof(${table.details}) = 'object'`,
  ),
  requestCreatedIndex: index("cush_verify_report_events_request_created_idx").on(table.requestId, table.createdAt),
})).enableRLS();

export const cushVerifyReportDeliveries = pgTable("cush_verify_report_deliveries", {
  id: serial("id").primaryKey(),
  requestId: uuid("request_id").notNull()
    .references(() => cushVerifyReportRequests.id, { onDelete: "cascade" }),
  reportDigest: text("report_digest").notNull(),
  categories: text("categories").array().$type<CushVerifyReportCategory[]>().notNull(),
  deliveredByInstitutionalUserId: integer("delivered_by_institutional_user_id").notNull()
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "restrict" }),
  deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  reportDigestCheck: check(
    "cush_verify_report_deliveries_digest_check",
    sql`${table.reportDigest} ~ '^[a-f0-9]{64}$'`,
  ),
  categoriesCheck: check(
    "cush_verify_report_deliveries_categories_check",
    sql`cardinality(${table.categories}) between 1 and 7
      and ${table.categories} <@ ARRAY['income_employment', 'rent_housing', 'savings', 'financial_commitments', 'score_summary', 'assessment_status', 'evidence_summary']::text[]`,
  ),
  requestDigestUnique: unique("cush_verify_report_deliveries_request_digest_uq")
    .on(table.requestId, table.reportDigest),
  institutionUserDateIndex: index("cush_verify_report_deliveries_actor_date_idx")
    .on(table.deliveredByInstitutionalUserId, table.deliveredAt),
})).enableRLS();

export const cushVerifyDiscoverySearches = pgTable("cush_verify_discovery_searches", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  institutionalUserId: integer("institutional_user_id").notNull()
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "restrict" }),
  identifierType: text("identifier_type").$type<"email" | "reference_code">().notNull(),
  identifierDigest: text("identifier_digest").notNull(),
  matchFound: boolean("match_found").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  typeCheck: check(
    "cush_verify_discovery_searches_identifier_type_check",
    sql`${table.identifierType} in ('email', 'reference_code')`,
  ),
  digestCheck: check(
    "cush_verify_discovery_searches_identifier_digest_check",
    sql`${table.identifierDigest} ~ '^[a-f0-9]{64}$'`,
  ),
  institutionCreatedIndex: index("cush_verify_discovery_searches_institution_created_idx")
    .on(table.institutionId, table.createdAt),
})).enableRLS();

export type CushVerifyPricingFeatureFlags = {
  fullPassportReports: boolean;
  incomeEmploymentHistory: boolean;
  rentHousingHistory: boolean;
  savingsHistory: boolean;
  financialCommitments: boolean;
  cushScore: boolean;
  confidenceInformation: boolean;
  evidenceClassifications: boolean;
  apiAccess: boolean;
  webhooks: boolean;
  usageAnalytics: boolean;
  auditLogs: boolean;
  teamAccounts: boolean;
};

export type CushVerifyPricingApiLimits = {
  requestsPerMinute: number | null;
  requestsPerHour: number | null;
  maxConcurrentRequests: number | null;
  monthlyReportLimit: number | null;
};

export type CushVerifyPricingFaq = {
  question: string;
  answer: string;
};

export const cushVerifyPricingVersions = pgTable("cush_verify_pricing_versions", {
  id: serial("id").primaryKey(),
  version: integer("version").notNull().unique(),
  status: text("status").$type<"draft" | "published" | "superseded" | "abandoned">().notNull().default("draft"),
  defaultCurrency: text("default_currency").notNull().default("USD"),
  annualDiscountBps: integer("annual_discount_bps").notNull().default(1500),
  faqItems: jsonb("faq_items").$type<CushVerifyPricingFaq[]>().notNull().default([]),
  createdBy: integer("created_by"),
  publishedBy: integer("published_by"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true, mode: "date" }),
}, (table) => ({
  statusCheck: check(
    "cush_verify_pricing_versions_status_check",
    sql`${table.status} in ('draft', 'published', 'superseded', 'abandoned')`,
  ),
  versionCheck: check("cush_verify_pricing_versions_version_check", sql`${table.version} > 0`),
  currencyCheck: check(
    "cush_verify_pricing_versions_currency_check",
    sql`${table.defaultCurrency} ~ '^[A-Z]{3}$'`,
  ),
  annualDiscountCheck: check(
    "cush_verify_pricing_versions_annual_discount_check",
    sql`${table.annualDiscountBps} between 0 and 9999`,
  ),
  faqItemsArrayCheck: check(
    "cush_verify_pricing_versions_faq_items_array_check",
    sql`jsonb_typeof(${table.faqItems}) = 'array'`,
  ),
  publicationTimestampCheck: check(
    "cush_verify_pricing_versions_publication_timestamp_check",
    sql`(${table.status} in ('draft', 'abandoned') and ${table.publishedAt} is null)
      or (${table.status} in ('published', 'superseded') and ${table.publishedAt} is not null)`,
  ),
  onePublishedVersion: uniqueIndex("cush_verify_pricing_versions_one_published_idx")
    .on(table.status).where(sql`${table.status} = 'published'`),
  oneDraftVersion: uniqueIndex("cush_verify_pricing_versions_one_draft_idx")
    .on(table.status).where(sql`${table.status} = 'draft'`),
  statusVersionIndex: index("cush_verify_pricing_versions_status_version_idx")
    .on(table.status, table.version),
})).enableRLS();

export const cushVerifyPricingPlans = pgTable("cush_verify_pricing_plans", {
  id: serial("id").primaryKey(),
  versionId: integer("version_id").notNull()
    .references(() => cushVerifyPricingVersions.id, { onDelete: "cascade" }),
  planKey: text("plan_key").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  currency: text("currency").notNull().default("USD"),
  monthlyPriceMinor: integer("monthly_price_minor"),
  includedReports: integer("included_reports").notNull().default(0),
  allocationMode: text("allocation_mode").$type<"sandbox" | "exact" | "minimum">().notNull().default("exact"),
  additionalReportPriceMinor: integer("additional_report_price_minor"),
  salesMode: text("sales_mode").$type<"sandbox_only" | "self_service" | "contact_sales">().notNull().default("self_service"),
  isActive: boolean("is_active").notNull().default(true),
  isArchived: boolean("is_archived").notNull().default(false),
  featureFlags: jsonb("feature_flags").$type<CushVerifyPricingFeatureFlags>().notNull(),
  apiLimits: jsonb("api_limits").$type<CushVerifyPricingApiLimits>().notNull(),
  supportLevel: text("support_level").$type<"not_configured" | "community" | "standard" | "priority" | "dedicated">().notNull().default("not_configured"),
}, (table) => ({
  planKeyCheck: check(
    "cush_verify_pricing_plans_key_check",
    sql`${table.planKey} ~ '^[a-z0-9][a-z0-9_-]{0,59}$'`,
  ),
  nameCheck: check(
    "cush_verify_pricing_plans_name_check",
    sql`char_length(btrim(${table.name})) between 1 and 100`,
  ),
  descriptionCheck: check(
    "cush_verify_pricing_plans_description_check",
    sql`char_length(${table.description}) <= 500`,
  ),
  currencyCheck: check(
    "cush_verify_pricing_plans_currency_check",
    sql`${table.currency} ~ '^[A-Z]{3}$'`,
  ),
  priceCheck: check(
    "cush_verify_pricing_plans_price_check",
    sql`(${table.monthlyPriceMinor} is null or ${table.monthlyPriceMinor} >= 0)
      and (${table.additionalReportPriceMinor} is null or ${table.additionalReportPriceMinor} >= 0)`,
  ),
  reportAllocationCheck: check(
    "cush_verify_pricing_plans_reports_check",
    sql`${table.includedReports} >= 0`,
  ),
  allocationModeCheck: check(
    "cush_verify_pricing_plans_allocation_mode_check",
    sql`${table.allocationMode} in ('sandbox', 'exact', 'minimum')`,
  ),
  salesModeCheck: check(
    "cush_verify_pricing_plans_sales_mode_check",
    sql`${table.salesMode} in ('sandbox_only', 'self_service', 'contact_sales')`,
  ),
  supportLevelCheck: check(
    "cush_verify_pricing_plans_support_level_check",
    sql`${table.supportLevel} in ('not_configured', 'community', 'standard', 'priority', 'dedicated')`,
  ),
  availabilityCheck: check(
    "cush_verify_pricing_plans_availability_check",
    sql`not (${table.isActive} and ${table.isArchived})`,
  ),
  salesPriceCheck: check(
    "cush_verify_pricing_plans_sales_price_check",
    sql`(${table.salesMode} <> 'contact_sales' or
        (${table.monthlyPriceMinor} is null and ${table.additionalReportPriceMinor} is null))
      and (${table.monthlyPriceMinor} is not null or ${table.salesMode} = 'contact_sales')`,
  ),
  sandboxModeCheck: check(
    "cush_verify_pricing_plans_sandbox_mode_check",
    sql`(${table.allocationMode} <> 'sandbox' or ${table.salesMode} = 'sandbox_only')
      and (${table.salesMode} <> 'sandbox_only' or ${table.allocationMode} = 'sandbox')`,
  ),
  minimumAllocationCheck: check(
    "cush_verify_pricing_plans_minimum_allocation_check",
    sql`${table.allocationMode} <> 'minimum' or ${table.includedReports} > 0`,
  ),
  featuresObjectCheck: check(
    "cush_verify_pricing_plans_features_object_check",
    sql`jsonb_typeof(${table.featureFlags}) = 'object'`,
  ),
  apiLimitsObjectCheck: check(
    "cush_verify_pricing_plans_api_limits_object_check",
    sql`jsonb_typeof(${table.apiLimits}) = 'object'`,
  ),
  versionPlanUnique: uniqueIndex("cush_verify_pricing_plans_version_key_uq")
    .on(table.versionId, table.planKey),
  versionIdIndex: index("cush_verify_pricing_plans_version_id_idx").on(table.versionId),
  activePlanIndex: index("cush_verify_pricing_plans_version_active_idx")
    .on(table.versionId, table.isActive, table.isArchived),
})).enableRLS();

export const cushVerifyBillingAccounts = pgTable("cush_verify_billing_accounts", {
  institutionId: integer("institution_id").primaryKey()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  stripeCustomerId: text("stripe_customer_id").unique(),
  availableCredits: integer("available_credits").notNull().default(0),
  currentPeriodUsed: integer("current_period_used").notNull().default(0),
  currentPeriodStartAt: timestamp("current_period_start_at", { withTimezone: true, mode: "date" }),
  currentPeriodEndAt: timestamp("current_period_end_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  balanceCheck: check("cush_verify_billing_accounts_balance_check", sql`${table.availableCredits} >= 0`),
  usageCheck: check("cush_verify_billing_accounts_usage_check", sql`${table.currentPeriodUsed} >= 0`),
  periodCheck: check(
    "cush_verify_billing_accounts_period_check",
    sql`(${table.currentPeriodStartAt} is null and ${table.currentPeriodEndAt} is null)
      or (${table.currentPeriodStartAt} is not null and ${table.currentPeriodEndAt} is not null
        and ${table.currentPeriodEndAt} > ${table.currentPeriodStartAt})`,
  ),
})).enableRLS();

export const cushVerifyStripePriceMappings = pgTable("cush_verify_stripe_price_mappings", {
  id: serial("id").primaryKey(),
  pricingVersionId: integer("pricing_version_id").notNull()
    .references(() => cushVerifyPricingVersions.id, { onDelete: "restrict" }),
  planKey: text("plan_key").notNull(),
  billingInterval: text("billing_interval").$type<"monthly" | "annual">().notNull(),
  stripeProductId: text("stripe_product_id").notNull(),
  stripePriceId: text("stripe_price_id").notNull().unique(),
  currency: text("currency").notNull(),
  unitAmountMinor: integer("unit_amount_minor").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  planReference: foreignKey({
    name: "cush_verify_stripe_price_mappings_plan_fk",
    columns: [table.pricingVersionId, table.planKey],
    foreignColumns: [cushVerifyPricingPlans.versionId, cushVerifyPricingPlans.planKey],
  }).onDelete("restrict"),
  intervalCheck: check(
    "cush_verify_stripe_price_mappings_interval_check",
    sql`${table.billingInterval} in ('monthly', 'annual')`,
  ),
  currencyCheck: check(
    "cush_verify_stripe_price_mappings_currency_check",
    sql`${table.currency} ~ '^[A-Z]{3}$'`,
  ),
  amountCheck: check(
    "cush_verify_stripe_price_mappings_amount_check",
    sql`${table.unitAmountMinor} >= 0`,
  ),
  versionPlanIntervalUnique: unique("cush_verify_stripe_price_mappings_version_plan_interval_uq")
    .on(table.pricingVersionId, table.planKey, table.billingInterval),
})).enableRLS();

export const cushVerifySubscriptions = pgTable("cush_verify_subscriptions", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  pricingVersionId: integer("pricing_version_id").notNull()
    .references(() => cushVerifyPricingVersions.id, { onDelete: "restrict" }),
  planKey: text("plan_key").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  stripePriceId: text("stripe_price_id").notNull(),
  billingInterval: text("billing_interval").$type<"monthly" | "annual">().notNull(),
  status: text("status").$type<
    "incomplete" | "trialing" | "active" | "past_due" | "canceled" | "unpaid" | "paused" | "suspended"
  >().notNull(),
  currency: text("currency").notNull(),
  unitAmountMinor: integer("unit_amount_minor").notNull(),
  includedReports: integer("included_reports").notNull(),
  additionalReportPriceMinor: integer("additional_report_price_minor"),
  currentPeriodStartAt: timestamp("current_period_start_at", { withTimezone: true, mode: "date" }).notNull(),
  currentPeriodEndAt: timestamp("current_period_end_at", { withTimezone: true, mode: "date" }).notNull(),
  nextCreditAllocationAt: timestamp("next_credit_allocation_at", { withTimezone: true, mode: "date" }),
  rolloverPolicy: text("rollover_policy").notNull().default("carry_all"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  graceEndsAt: timestamp("grace_ends_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true, mode: "date" }),
}, (table) => ({
  statusCheck: check(
    "cush_verify_subscriptions_status_check",
    sql`${table.status} in ('incomplete', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused', 'suspended')`,
  ),
  intervalCheck: check(
    "cush_verify_subscriptions_interval_check",
    sql`${table.billingInterval} in ('monthly', 'annual')`,
  ),
  currencyCheck: check("cush_verify_subscriptions_currency_check", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  priceCheck: check(
    "cush_verify_subscriptions_price_check",
    sql`${table.unitAmountMinor} >= 0 and ${table.includedReports} >= 0
      and (${table.additionalReportPriceMinor} is null or ${table.additionalReportPriceMinor} >= 0)`,
  ),
  periodCheck: check(
    "cush_verify_subscriptions_period_check",
    sql`${table.currentPeriodEndAt} > ${table.currentPeriodStartAt}`,
  ),
  rolloverPolicyCheck: check(
    "cush_verify_subscriptions_rollover_policy_check",
    sql`${table.rolloverPolicy} = 'carry_all'`,
  ),
  oneCurrentSubscription: uniqueIndex("cush_verify_subscriptions_one_current_per_institution_idx")
    .on(table.institutionId)
    .where(sql`${table.status} in ('incomplete', 'trialing', 'active', 'past_due', 'unpaid', 'paused', 'suspended')`),
  institutionStatusIndex: index("cush_verify_subscriptions_institution_status_idx")
    .on(table.institutionId, table.status),
  creditAllocationIndex: index("cush_verify_subscriptions_credit_allocation_idx")
    .on(table.status, table.nextCreditAllocationAt),
})).enableRLS();

export const cushVerifyCreditLedger = pgTable("cush_verify_credit_ledger", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  subscriptionId: integer("subscription_id")
    .references(() => cushVerifySubscriptions.id, { onDelete: "restrict" }),
  reportDeliveryId: integer("report_delivery_id")
    .references(() => cushVerifyReportDeliveries.id, { onDelete: "restrict" }),
  entryType: text("entry_type").$type<
    "allocation" | "report_debit" | "overage" | "rollover" | "promotional_credit" | "reversal" | "admin_adjustment" | "expiration"
  >().notNull(),
  creditDelta: integer("credit_delta").notNull().default(0),
  amountMinor: integer("amount_minor"),
  currency: text("currency"),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdByAdminUserId: integer("created_by_admin_user_id"),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  entryTypeCheck: check(
    "cush_verify_credit_ledger_entry_type_check",
    sql`${table.entryType} in ('allocation', 'report_debit', 'overage', 'rollover', 'promotional_credit', 'reversal', 'admin_adjustment', 'expiration')`,
  ),
  amountCheck: check(
    "cush_verify_credit_ledger_amount_check",
    sql`abs(${table.creditDelta}::bigint) <= 2000000000
      and (${table.amountMinor} is null or abs(${table.amountMinor}::bigint) <= 2000000000)`,
  ),
  currencyCheck: check(
    "cush_verify_credit_ledger_currency_check",
    sql`${table.currency} is null or ${table.currency} ~ '^[A-Z]{3}$'`,
  ),
  detailsObjectCheck: check(
    "cush_verify_credit_ledger_details_check",
    sql`jsonb_typeof(${table.details}) = 'object'`,
  ),
  idempotencyKeyCheck: check(
    "cush_verify_credit_ledger_idempotency_check",
    sql`char_length(${table.idempotencyKey}) between 1 and 200`,
  ),
  deliveryUnique: unique("cush_verify_credit_ledger_delivery_uq").on(table.reportDeliveryId),
  institutionCreatedIndex: index("cush_verify_credit_ledger_institution_created_idx")
    .on(table.institutionId, table.createdAt),
})).enableRLS();

export const cushVerifyStripeWebhookEvents = pgTable("cush_verify_stripe_webhook_events", {
  eventId: text("event_id").primaryKey(),
  eventType: text("event_type").notNull(),
  stripeObjectId: text("stripe_object_id"),
  receivedAt: timestamp("received_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  eventTypeCheck: check(
    "cush_verify_stripe_webhook_events_type_check",
    sql`char_length(${table.eventType}) between 1 and 100`,
  ),
  processedIndex: index("cush_verify_stripe_webhook_events_processed_idx").on(table.processedAt),
})).enableRLS();

export const cushVerifyBillingOutbox = pgTable("cush_verify_billing_outbox", {
  id: serial("id").primaryKey(),
  ledgerId: integer("ledger_id").notNull().unique()
    .references(() => cushVerifyCreditLedger.id, { onDelete: "restrict" }),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  status: text("status").$type<"pending" | "processing" | "sent">().notNull().default("pending"),
  stripeInvoiceItemId: text("stripe_invoice_item_id").unique(),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
  lastErrorCode: text("last_error_code"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  statusCheck: check(
    "cush_verify_billing_outbox_status_check",
    sql`${table.status} in ('pending', 'processing', 'sent')`,
  ),
  attemptCountCheck: check(
    "cush_verify_billing_outbox_attempt_count_check",
    sql`${table.attemptCount} >= 0`,
  ),
  retryIndex: index("cush_verify_billing_outbox_retry_idx")
    .on(table.status, table.nextAttemptAt),
})).enableRLS();

export type CushVerifyApiEnvironment = "sandbox" | "production";
export type CushVerifyApiKeyStatus = "active" | "revoked";
export type CushVerifyApiUsageStatus = "processing" | "completed";
export type CushVerifyApiAccessRequestStatus = "submitted" | "approved" | "rejected";
export type CushVerifyApiAccessEmailStatus = "sending" | "sent" | "not_configured" | "failed";

export const cushVerifyApiAccessRequests = pgTable("cush_verify_api_access_requests", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  requestedByInstitutionalUserId: integer("requested_by_institutional_user_id").notNull()
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "restrict" }),
  intendedUse: text("intended_use").notNull(),
  estimatedMonthlyRequests: integer("estimated_monthly_requests"),
  status: text("status").$type<CushVerifyApiAccessRequestStatus>().notNull().default("submitted"),
  reviewedByAdminUserId: integer("reviewed_by_admin_user_id"),
  decisionNote: text("decision_note"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
  emailNotificationStatus: text("email_notification_status").$type<CushVerifyApiAccessEmailStatus | null>(),
  emailNotificationAttemptCount: integer("email_notification_attempt_count").notNull().default(0),
  emailNotificationAttemptedAt: timestamp("email_notification_attempted_at", { withTimezone: true, mode: "date" }),
  emailNotificationLastAttemptedByAdminUserId: integer("email_notification_last_attempted_by_admin_user_id"),
}, (table) => ({
  statusCheck: check(
    "cush_verify_api_access_requests_status_check",
    sql`${table.status} in ('submitted', 'approved', 'rejected')`,
  ),
  intendedUseCheck: check(
    "cush_verify_api_access_requests_intended_use_check",
    sql`char_length(btrim(${table.intendedUse})) between 10 and 1200`,
  ),
  estimatedMonthlyRequestsCheck: check(
    "cush_verify_api_access_requests_estimated_monthly_check",
    sql`${table.estimatedMonthlyRequests} is null or ${table.estimatedMonthlyRequests} between 0 and 10000000`,
  ),
  decisionNoteCheck: check(
    "cush_verify_api_access_requests_decision_note_check",
    sql`${table.decisionNote} is null or char_length(btrim(${table.decisionNote})) between 1 and 1200`,
  ),
  decisionActorTimestampCheck: check(
    "cush_verify_api_access_requests_decision_actor_timestamp_check",
    sql`(${table.status} = 'submitted' and ${table.reviewedByAdminUserId} is null and ${table.reviewedAt} is null)
      or (${table.status} in ('approved', 'rejected') and ${table.reviewedByAdminUserId} is not null and ${table.reviewedAt} is not null)`,
  ),
  rejectedDecisionNoteCheck: check(
    "cush_verify_api_access_requests_rejection_note_check",
    sql`${table.status} <> 'rejected' or ${table.decisionNote} is not null`,
  ),
  emailNotificationStatusCheck: check(
    "cush_verify_api_access_requests_email_notification_status_check",
    sql`${table.emailNotificationStatus} is null or ${table.emailNotificationStatus} in ('sending', 'sent', 'not_configured', 'failed')`,
  ),
  emailNotificationAttemptCountCheck: check(
    "cush_verify_api_access_requests_email_notification_attempt_count_check",
    sql`${table.emailNotificationAttemptCount} >= 0`,
  ),
  emailNotificationAttemptMetadataCheck: check(
    "cush_verify_api_access_requests_email_notification_metadata_check",
    sql`(${table.emailNotificationStatus} is null and ${table.emailNotificationAttemptCount} = 0
        and ${table.emailNotificationAttemptedAt} is null and ${table.emailNotificationLastAttemptedByAdminUserId} is null)
      or (${table.emailNotificationStatus} is not null and ${table.emailNotificationAttemptCount} > 0
        and ${table.emailNotificationAttemptedAt} is not null and ${table.emailNotificationLastAttemptedByAdminUserId} is not null)`,
  ),
  oneSubmittedRequestPerInstitution: uniqueIndex("cush_verify_api_access_requests_one_submitted_per_institution_idx")
    .on(table.institutionId)
    .where(sql`${table.status} = 'submitted'`),
  institutionCreatedIndex: index("cush_verify_api_access_requests_institution_created_idx")
    .on(table.institutionId, table.createdAt),
  statusCreatedIndex: index("cush_verify_api_access_requests_status_created_idx")
    .on(table.status, table.createdAt),
})).enableRLS();

export const cushVerifyApiAccessRequestEvents = pgTable("cush_verify_api_access_request_events", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").notNull()
    .references(() => cushVerifyApiAccessRequests.id, { onDelete: "restrict" }),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  actorType: text("actor_type").$type<"organisation_admin" | "cush_admin">().notNull(),
  actorInstitutionalUserId: integer("actor_institutional_user_id")
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "restrict" }),
  actorCushUserId: integer("actor_cush_user_id"),
  eventType: text("event_type").$type<
    "submitted" | "approved" | "rejected" | "approval_email_retry_started" | "approval_email_retry_completed"
  >().notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  actorTypeCheck: check(
    "cush_verify_api_access_request_events_actor_type_check",
    sql`${table.actorType} in ('organisation_admin', 'cush_admin')`,
  ),
  actorIdentityCheck: check(
    "cush_verify_api_access_request_events_actor_identity_check",
    sql`(${table.actorType} = 'organisation_admin' and ${table.actorInstitutionalUserId} is not null and ${table.actorCushUserId} is null)
      or (${table.actorType} = 'cush_admin' and ${table.actorInstitutionalUserId} is null and ${table.actorCushUserId} is not null)`,
  ),
  eventTypeCheck: check(
    "cush_verify_api_access_request_events_type_check",
    sql`${table.eventType} in ('submitted', 'approved', 'rejected', 'approval_email_retry_started', 'approval_email_retry_completed')`,
  ),
  detailsObjectCheck: check(
    "cush_verify_api_access_request_events_details_check",
    sql`jsonb_typeof(${table.details}) = 'object'`,
  ),
  institutionCreatedIndex: index("cush_verify_api_access_request_events_institution_created_idx")
    .on(table.institutionId, table.createdAt),
  requestCreatedIndex: index("cush_verify_api_access_request_events_request_created_idx")
    .on(table.requestId, table.createdAt),
})).enableRLS();

export const cushVerifyApiKeys = pgTable("cush_verify_api_keys", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  createdByInstitutionalUserId: integer("created_by_institutional_user_id").notNull()
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  environment: text("environment").$type<CushVerifyApiEnvironment>().notNull(),
  keyPrefix: text("key_prefix").notNull().unique(),
  secretHash: text("secret_hash").notNull().unique(),
  scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
  status: text("status").$type<CushVerifyApiKeyStatus>().notNull().default("active"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true, mode: "date" }),
  revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  environmentCheck: check(
    "cush_verify_api_keys_environment_check",
    sql`${table.environment} in ('sandbox', 'production')`,
  ),
  statusCheck: check(
    "cush_verify_api_keys_status_check",
    sql`(${table.status} = 'active' and ${table.revokedAt} is null)
      or (${table.status} = 'revoked' and ${table.revokedAt} is not null)`,
  ),
  nameCheck: check(
    "cush_verify_api_keys_name_check",
    sql`char_length(btrim(${table.name})) between 1 and 80`,
  ),
  prefixCheck: check(
    "cush_verify_api_keys_prefix_check",
    sql`${table.keyPrefix} ~ '^cvk_(sandbox|production)_[a-f0-9]{24}$'`,
  ),
  secretHashCheck: check(
    "cush_verify_api_keys_secret_hash_check",
    sql`${table.secretHash} ~ '^[a-f0-9]{64}$'`,
  ),
  scopesArrayCheck: check(
    "cush_verify_api_keys_scopes_array_check",
    sql`jsonb_typeof(${table.scopes}) = 'array'`,
  ),
  institutionEnvironmentStatusIndex: index("cush_verify_api_keys_institution_environment_status_idx")
    .on(table.institutionId, table.environment, table.status, table.createdAt),
})).enableRLS();

export const cushVerifyApiUsage = pgTable("cush_verify_api_usage", {
  id: serial("id").primaryKey(),
  requestId: uuid("request_id").notNull().unique(),
  institutionId: integer("institution_id")
    .references(() => cushVerifyInstitutions.id, { onDelete: "set null" }),
  apiKeyId: integer("api_key_id")
    .references(() => cushVerifyApiKeys.id, { onDelete: "set null" }),
  environment: text("environment").$type<CushVerifyApiEnvironment>().notNull(),
  endpoint: text("endpoint").notNull(),
  method: text("method").notNull(),
  state: text("state").$type<CushVerifyApiUsageStatus>().notNull().default("processing"),
  responseStatus: integer("response_status"),
  durationMs: integer("duration_ms"),
  billableReport: boolean("billable_report").notNull().default(false),
  clientIpHash: text("client_ip_hash"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
}, (table) => ({
  environmentCheck: check(
    "cush_verify_api_usage_environment_check",
    sql`${table.environment} in ('sandbox', 'production')`,
  ),
  endpointCheck: check(
    "cush_verify_api_usage_endpoint_check",
    sql`char_length(${table.endpoint}) between 1 and 180`,
  ),
  methodCheck: check(
    "cush_verify_api_usage_method_check",
    sql`${table.method} in ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')`,
  ),
  stateCheck: check(
    "cush_verify_api_usage_state_check",
    sql`(${table.state} = 'processing' and ${table.completedAt} is null)
      or (${table.state} = 'completed' and ${table.completedAt} is not null)`,
  ),
  statusCodeCheck: check(
    "cush_verify_api_usage_status_code_check",
    sql`${table.responseStatus} is null or ${table.responseStatus} between 100 and 599`,
  ),
  durationCheck: check(
    "cush_verify_api_usage_duration_check",
    sql`${table.durationMs} is null or ${table.durationMs} >= 0`,
  ),
  clientIpHashCheck: check(
    "cush_verify_api_usage_client_ip_hash_check",
    sql`${table.clientIpHash} is null or ${table.clientIpHash} ~ '^[a-f0-9]{64}$'`,
  ),
  institutionCreatedIndex: index("cush_verify_api_usage_institution_created_idx")
    .on(table.institutionId, table.createdAt),
  institutionEnvironmentCreatedIndex: index("cush_verify_api_usage_institution_environment_created_idx")
    .on(table.institutionId, table.environment, table.createdAt),
  keyCreatedIndex: index("cush_verify_api_usage_key_created_idx")
    .on(table.apiKeyId, table.createdAt),
  inFlightIndex: index("cush_verify_api_usage_in_flight_idx")
    .on(table.institutionId, table.createdAt)
    .where(sql`${table.state} = 'processing'`),
  clientIpHashCreatedIndex: index("cush_verify_api_usage_client_ip_hash_created_idx")
    .on(table.clientIpHash, table.createdAt)
    .where(sql`${table.clientIpHash} is not null`),
}));

export const cushVerifyApiKeyEvents = pgTable("cush_verify_api_key_events", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  apiKeyId: integer("api_key_id")
    .references(() => cushVerifyApiKeys.id, { onDelete: "set null" }),
  actorInstitutionalUserId: integer("actor_institutional_user_id")
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "set null" }),
  eventType: text("event_type").$type<"created" | "rotated" | "revoked">().notNull(),
  environment: text("environment").$type<CushVerifyApiEnvironment>().notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  eventTypeCheck: check(
    "cush_verify_api_key_events_type_check",
    sql`${table.eventType} in ('created', 'rotated', 'revoked')`,
  ),
  environmentCheck: check(
    "cush_verify_api_key_events_environment_check",
    sql`${table.environment} in ('sandbox', 'production')`,
  ),
  detailsObjectCheck: check(
    "cush_verify_api_key_events_details_check",
    sql`jsonb_typeof(${table.details}) = 'object'`,
  ),
  institutionCreatedIndex: index("cush_verify_api_key_events_institution_created_idx")
    .on(table.institutionId, table.createdAt),
})).enableRLS();

export const cushVerifyWebhookDestinations = pgTable("cush_verify_webhook_destinations", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  createdByInstitutionalUserId: integer("created_by_institutional_user_id").notNull()
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  url: text("url").notNull(),
  environment: text("environment").$type<CushVerifyApiEnvironment>().notNull(),
  eventTypes: text("event_types").array().$type<string[]>().notNull(),
  usageThresholdPercentages: integer("usage_threshold_percentages").array().notNull().default([]),
  secretCiphertext: text("secret_ciphertext").notNull(),
  secretIv: text("secret_iv").notNull(),
  secretTag: text("secret_tag").notNull(),
  status: text("status").$type<"active" | "disabled" | "deleted">().notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "date" }),
}, (table) => ({
  nameCheck: check("cush_verify_webhook_destinations_name_check",
    sql`char_length(btrim(${table.name})) between 1 and 80`),
  urlCheck: check("cush_verify_webhook_destinations_url_check",
    sql`${table.url} ~ '^https://' and char_length(${table.url}) <= 2048`),
  environmentCheck: check("cush_verify_webhook_destinations_environment_check",
    sql`${table.environment} in ('sandbox', 'production')`),
  eventTypesCheck: check("cush_verify_webhook_destinations_event_types_check",
    sql`cardinality(${table.eventTypes}) between 1 and 8
      and ${table.eventTypes} <@ ARRAY['report.requested', 'request.linked', 'consent.approved',
        'consent.declined', 'consent.revoked', 'report.delivered', 'report.accessed',
        'usage.threshold_reached']::text[]`),
  usageThresholdsCheck: check("cush_verify_webhook_destinations_thresholds_check",
    sql`cardinality(${table.usageThresholdPercentages}) <= 10
      and ${table.usageThresholdPercentages} <@ ARRAY[5,10,20,25,50,75,80,90,95,100]::integer[]`),
  statusCheck: check("cush_verify_webhook_destinations_status_check",
    sql`(${table.status} = 'active' and ${table.deletedAt} is null)
      or (${table.status} = 'disabled' and ${table.deletedAt} is null)
      or (${table.status} = 'deleted' and ${table.deletedAt} is not null)`),
  encryptedSecretStateCheck: check("cush_verify_webhook_destinations_encrypted_secret_state_check",
    sql`(${table.status} = 'deleted' and ${table.secretCiphertext} = ''
        and ${table.secretIv} = '' and ${table.secretTag} = '')
      or (${table.status} in ('active', 'disabled') and ${table.secretCiphertext} <> ''
        and ${table.secretIv} <> '' and ${table.secretTag} <> '')`),
  idInstitutionUnique: unique("cush_verify_webhook_destinations_id_institution_uq")
    .on(table.id, table.institutionId),
  institutionEnvironmentStatusIndex: index("cush_verify_webhook_destinations_tenant_status_idx")
    .on(table.institutionId, table.environment, table.status, table.createdAt),
})).enableRLS();

export const cushVerifyWebhookEvents = pgTable("cush_verify_webhook_events", {
  id: uuid("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  environment: text("environment").$type<CushVerifyApiEnvironment>().notNull(),
  eventType: text("event_type").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  environmentCheck: check("cush_verify_webhook_events_environment_check",
    sql`${table.environment} in ('sandbox', 'production')`),
  eventTypeCheck: check("cush_verify_webhook_events_type_check",
    sql`${table.eventType} in ('report.requested', 'request.linked', 'consent.approved',
      'consent.declined', 'consent.revoked', 'report.delivered', 'report.accessed',
      'usage.threshold_reached')`),
  idempotencyCheck: check("cush_verify_webhook_events_idempotency_check",
    sql`char_length(${table.idempotencyKey}) between 1 and 180`),
  payloadObjectCheck: check("cush_verify_webhook_events_payload_check",
    sql`jsonb_typeof(${table.payload}) = 'object' and octet_length(${table.payload}::text) <= 8192`),
  tenantIdempotencyUnique: unique("cush_verify_webhook_events_tenant_idempotency_uq")
    .on(table.institutionId, table.environment, table.idempotencyKey),
  idInstitutionUnique: unique("cush_verify_webhook_events_id_institution_uq")
    .on(table.id, table.institutionId),
  institutionCreatedIndex: index("cush_verify_webhook_events_tenant_created_idx")
    .on(table.institutionId, table.createdAt),
})).enableRLS();

export const cushVerifyWebhookDeliveries = pgTable("cush_verify_webhook_deliveries", {
  id: serial("id").primaryKey(),
  eventId: uuid("event_id").notNull(),
  destinationId: integer("destination_id").notNull(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  status: text("status").$type<"pending" | "processing" | "delivered" | "failed" | "cancelled">()
    .notNull().default("pending"),
  attemptCount: integer("attempt_count").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "date" }),
  lastStatusCode: integer("last_status_code"),
  lastErrorCode: text("last_error_code"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "date" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  eventTenantForeignKey: foreignKey({
    name: "cush_verify_webhook_deliveries_event_tenant_fk",
    columns: [table.eventId, table.institutionId],
    foreignColumns: [cushVerifyWebhookEvents.id, cushVerifyWebhookEvents.institutionId],
  }).onDelete("restrict"),
  destinationTenantForeignKey: foreignKey({
    name: "cush_verify_webhook_deliveries_destination_tenant_fk",
    columns: [table.destinationId, table.institutionId],
    foreignColumns: [cushVerifyWebhookDestinations.id, cushVerifyWebhookDestinations.institutionId],
  }).onDelete("restrict"),
  statusCheck: check("cush_verify_webhook_deliveries_status_check",
    sql`${table.status} in ('pending', 'processing', 'delivered', 'failed', 'cancelled')`),
  attemptsCheck: check("cush_verify_webhook_deliveries_attempts_check",
    sql`${table.attemptCount} between 0 and 8`),
  responseStatusCheck: check("cush_verify_webhook_deliveries_response_status_check",
    sql`${table.lastStatusCode} is null or ${table.lastStatusCode} between 100 and 599`),
  deliveredTimestampCheck: check("cush_verify_webhook_deliveries_delivered_at_check",
    sql`(${table.status} = 'delivered' and ${table.deliveredAt} is not null)
      or (${table.status} <> 'delivered' and ${table.deliveredAt} is null)`),
  eventDestinationUnique: unique("cush_verify_webhook_deliveries_event_destination_uq")
    .on(table.eventId, table.destinationId),
  idInstitutionUnique: unique("cush_verify_webhook_deliveries_id_institution_uq")
    .on(table.id, table.institutionId),
  queueIndex: index("cush_verify_webhook_deliveries_queue_idx")
    .on(table.status, table.nextAttemptAt, table.lockedUntil),
  tenantCreatedIndex: index("cush_verify_webhook_deliveries_tenant_created_idx")
    .on(table.institutionId, table.createdAt),
})).enableRLS();

export const cushVerifyWebhookDeliveryAttempts = pgTable("cush_verify_webhook_delivery_attempts", {
  id: serial("id").primaryKey(),
  deliveryId: integer("delivery_id").notNull()
    .references(() => cushVerifyWebhookDeliveries.id, { onDelete: "cascade" }),
  attemptNumber: integer("attempt_number").notNull(),
  outcome: text("outcome").$type<"processing" | "delivered" | "retrying" | "failed">()
    .notNull().default("processing"),
  responseStatus: integer("response_status"),
  errorCode: text("error_code"),
  durationMs: integer("duration_ms"),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
}, (table) => ({
  attemptNumberCheck: check("cush_verify_webhook_delivery_attempts_number_check",
    sql`${table.attemptNumber} between 1 and 8`),
  outcomeCheck: check("cush_verify_webhook_delivery_attempts_outcome_check",
    sql`${table.outcome} in ('processing', 'delivered', 'retrying', 'failed')`),
  responseStatusCheck: check("cush_verify_webhook_delivery_attempts_status_check",
    sql`${table.responseStatus} is null or ${table.responseStatus} between 100 and 599`),
  durationCheck: check("cush_verify_webhook_delivery_attempts_duration_check",
    sql`${table.durationMs} is null or ${table.durationMs} >= 0`),
  uniqueDeliveryAttempt: unique("cush_verify_webhook_delivery_attempts_delivery_number_uq")
    .on(table.deliveryId, table.attemptNumber),
})).enableRLS();

export const cushVerifyWebhookFailureNotifications = pgTable("cush_verify_webhook_failure_notifications", {
  id: serial("id").primaryKey(),
  deliveryId: integer("delivery_id").notNull(),
  institutionId: integer("institution_id").notNull(),
  institutionalUserId: integer("institutional_user_id").notNull(),
  readAt: timestamp("read_at", { withTimezone: true, mode: "date" }),
  emailStatus: text("email_status").$type<"pending" | "sending" | "sent" | "failed" | "not_configured">()
    .notNull().default("pending"),
  emailAttemptCount: integer("email_attempt_count").notNull().default(0),
  emailNextAttemptAt: timestamp("email_next_attempt_at", { withTimezone: true, mode: "date" })
    .notNull().defaultNow(),
  emailLockedUntil: timestamp("email_locked_until", { withTimezone: true, mode: "date" }),
  emailLastAttemptedAt: timestamp("email_last_attempted_at", { withTimezone: true, mode: "date" }),
  emailLastErrorCode: text("email_last_error_code"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  deliveryTenantForeignKey: foreignKey({
    name: "cush_verify_webhook_failure_notifications_delivery_tenant_fk",
    columns: [table.deliveryId, table.institutionId],
    foreignColumns: [cushVerifyWebhookDeliveries.id, cushVerifyWebhookDeliveries.institutionId],
  }).onDelete("cascade"),
  membershipForeignKey: foreignKey({
    name: "cush_verify_webhook_failure_notifications_membership_fk",
    columns: [table.institutionId, table.institutionalUserId],
    foreignColumns: [
      cushVerifyInstitutionalMemberships.institutionId,
      cushVerifyInstitutionalMemberships.institutionalUserId,
    ],
  }).onDelete("cascade"),
  emailStatusCheck: check("cush_verify_webhook_failure_notifications_email_status_check",
    sql`${table.emailStatus} in ('pending', 'sending', 'sent', 'failed', 'not_configured')`),
  emailAttemptsCheck: check("cush_verify_webhook_failure_notifications_email_attempts_check",
    sql`${table.emailAttemptCount} between 0 and 5`),
  emailErrorCodeCheck: check("cush_verify_webhook_failure_notifications_email_error_code_check",
    sql`${table.emailLastErrorCode} is null or ${table.emailLastErrorCode} ~ '^[a-z0-9_]{1,60}$'`),
  recipientCreatedIndex: index("cush_verify_webhook_failure_notifications_recipient_created_idx")
    .on(table.institutionId, table.institutionalUserId, table.createdAt),
  emailQueueIndex: index("cush_verify_webhook_failure_notifications_email_queue_idx")
    .on(table.emailStatus, table.emailNextAttemptAt, table.emailLockedUntil),
  deliveryRecipientUnique: unique("cush_verify_webhook_failure_notifications_delivery_recipient_uq")
    .on(table.deliveryId, table.institutionalUserId),
})).enableRLS();

export const cushVerifyWebhookAuditEvents = pgTable("cush_verify_webhook_audit_events", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull()
    .references(() => cushVerifyInstitutions.id, { onDelete: "restrict" }),
  destinationId: integer("destination_id")
    .references(() => cushVerifyWebhookDestinations.id, { onDelete: "set null" }),
  actorInstitutionalUserId: integer("actor_institutional_user_id")
    .references(() => cushVerifyInstitutionalUsers.id, { onDelete: "set null" }),
  eventType: text("event_type").$type<"created" | "updated" | "disabled" | "deleted" | "secret_rotated">()
    .notNull(),
  details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  eventTypeCheck: check("cush_verify_webhook_audit_events_type_check",
    sql`${table.eventType} in ('created', 'updated', 'disabled', 'deleted', 'secret_rotated')`),
  detailsObjectCheck: check("cush_verify_webhook_audit_events_details_check",
    sql`jsonb_typeof(${table.details}) = 'object'`),
  tenantCreatedIndex: index("cush_verify_webhook_audit_events_tenant_created_idx")
    .on(table.institutionId, table.createdAt),
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

// ─── Passport Evidence Intake ────────────────────────────────────────────────
// User-entered details and document contents are encrypted before persistence.
// Manual history may feed provisional V2 components as self-reported only after
// supported currency conversion; uploaded documents do not become score inputs
// through extraction or review alone.
export const cushPassportFinancialProfiles = pgTable("cush_passport_financial_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  countryCode: text("country_code").notNull(),
  currencyCode: text("currency_code").notNull(),
  encryptedProfile: text("encrypted_profile").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  countryCodeCheck: check("cush_passport_financial_profiles_country_check", sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
  currencyCodeCheck: check("cush_passport_financial_profiles_currency_check", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
})).enableRLS();

export const cushPassportPostArrivalFinancialProfiles = pgTable("cush_passport_post_arrival_financial_profiles", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  countryCode: text("country_code").notNull(),
  currencyCode: text("currency_code").notNull(),
  encryptedProfile: text("encrypted_profile").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  countryCodeCheck: check("cush_passport_post_arrival_financial_profiles_country_check", sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
  currencyCodeCheck: check("cush_passport_post_arrival_financial_profiles_currency_check", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
})).enableRLS();

export const cushPassportEvidenceSubmissions = pgTable("cush_passport_evidence_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  period: text("period").notNull().default("pre_arrival"),
  documentType: text("document_type").notNull(),
  label: text("label").notNull(),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size").notNull(),
  countryCode: text("country_code").notNull(),
  currencyCode: text("currency_code").notNull(),
  encryptedFile: text("encrypted_file").notNull(),
  encryptedExtraction: text("encrypted_extraction").notNull(),
  encryptedCorrection: text("encrypted_correction"),
  encryptedReview: text("encrypted_review"),
  reviewStatus: text("review_status").notNull().default("draft"),
  evidenceClassification: text("evidence_classification").notNull().default("self_declared"),
  submittedAt: timestamp("submitted_at", { withTimezone: true, mode: "date" }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: "date" }),
  reviewedBy: integer("reviewed_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  documentTypeCheck: check(
    "cush_passport_evidence_submissions_type_check",
    sql`${table.documentType} in ('payslip', 'bank_statement', 'rent_receipt', 'savings_statement', 'commitment_statement', 'proof_of_residency', 'tax_return', 'employment_contract', 'transfer_receipt', 'other')`,
  ),
  reviewStatusCheck: check(
    "cush_passport_evidence_submissions_status_check",
    sql`${table.reviewStatus} in ('draft', 'submitted', 'under_review', 'additional_information_required', 'approved', 'rejected')`,
  ),
  classificationCheck: check(
    "cush_passport_evidence_submissions_classification_check",
    sql`${table.evidenceClassification} in ('self_declared', 'document_supported', 'independently_verified', 'institution_confirmed')`,
  ),
  periodCheck: check("cush_passport_evidence_submissions_period_check", sql`${table.period} in ('pre_arrival', 'post_arrival')`),
  fileSizeCheck: check("cush_passport_evidence_submissions_file_size_check", sql`${table.fileSize} between 1 and 5242880`),
  countryCodeCheck: check("cush_passport_evidence_submissions_country_check", sql`${table.countryCode} ~ '^[A-Z]{2}$'`),
  currencyCodeCheck: check("cush_passport_evidence_submissions_currency_check", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
  userCreatedIndex: index("cush_passport_evidence_submissions_user_created_idx").on(table.userId, table.createdAt),
  userPeriodCreatedIndex: index("cush_passport_evidence_submissions_user_period_created_idx").on(table.userId, table.period, table.createdAt),
  statusCreatedIndex: index("cush_passport_evidence_submissions_status_created_idx").on(table.reviewStatus, table.createdAt),
})).enableRLS();

export const cushPassportEvidenceEvents = pgTable("cush_passport_evidence_events", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id").references(() => cushPassportEvidenceSubmissions.id, { onDelete: "set null" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorType: text("actor_type").notNull(),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  actorTypeCheck: check("cush_passport_evidence_events_actor_check", sql`${table.actorType} in ('user', 'admin', 'system')`),
  eventTypeCheck: check(
    "cush_passport_evidence_events_type_check",
    sql`${table.eventType} in ('profile_saved', 'profile_deleted', 'document_uploaded', 'draft_corrected', 'document_submitted', 'document_deleted', 'document_accessed', 'review_opened', 'review_decided')`,
  ),
  userCreatedIndex: index("cush_passport_evidence_events_user_created_idx").on(table.userId, table.createdAt),
  submissionCreatedIndex: index("cush_passport_evidence_events_submission_created_idx").on(table.submissionId, table.createdAt),
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
      self_reported: z.union([z.literal(0), z.literal(5)]),
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
