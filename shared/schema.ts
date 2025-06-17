import { pgTable, text, serial, integer, decimal, timestamp, boolean, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").default("customer"), // customer, admin
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number"),
  nationality: text("nationality"),
  isEmailVerified: boolean("is_email_verified").default(false),
  isPhoneVerified: boolean("is_phone_verified").default(false),
  acceptTerms: boolean("accept_terms").notNull(),
  acceptPrivacy: boolean("accept_privacy").notNull(),
  marketingConsent: boolean("marketing_consent").default(false),
  mfaEnabled: boolean("mfa_enabled").default(false),
  mfaBackupCodes: text("mfa_backup_codes").array(),
  lastLoginAt: timestamp("last_login_at"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // checking, savings, investment
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  currency: text("currency").default("USD"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  accountId: integer("account_id").references(() => accounts.id),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // income, expense, transfer
  category: text("category"),
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const balanceHistory = pgTable("balance_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  totalBalance: decimal("total_balance", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat messages for Imisi 2.0 AI assistant
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message: text("message").notNull(),
  response: text("response").notNull(),
  context: json("context").$type<Record<string, any>>(),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI assistant context for personalization
export const aiAssistantContext = pgTable("ai_assistant_context", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  contextType: text("context_type").notNull(), // 'preference', 'goal', 'history', etc.
  contextData: json("context_data").$type<Record<string, any>>().notNull(),
  priority: integer("priority").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User audit log table
export const userAuditLogs = pgTable("user_audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // login, logout, register, profile_update, password_change, mfa_enable, mfa_disable
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  details: text("details"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow(),
});

// Community Insights table
export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"), // Short description for listings
  authorId: integer("author_id").notNull().references(() => users.id),
  category: text("category").notNull(), // migration, finance, legal, housing, employment
  tags: text("tags").array(), // Additional categorization
  status: text("status").default("published"), // draft, published, archived
  viewCount: integer("view_count").default(0),
  featuredImage: text("featured_image"), // URL to image
  readTime: integer("read_time"), // Estimated read time in minutes
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mentors table
export const mentors = pgTable("mentors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  specialty: text("specialty").notNull(), // finance, legal, career, housing, immigration
  bio: text("bio").notNull(),
  experience: text("experience"), // Years of experience or background
  availability: json("availability").$type<{
    timezone: string;
    weekdays: { day: string; startTime: string; endTime: string; }[];
    isActive: boolean;
  }>(),
  hourlyRate: decimal("hourly_rate", { precision: 8, scale: 2 }), // Optional pricing
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"), // Average rating
  totalSessions: integer("total_sessions").default(0),
  languages: text("languages").array(), // Languages spoken
  certifications: text("certifications").array(), // Professional certifications
  linkedinUrl: text("linkedin_url"),
  isVerified: boolean("is_verified").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community Events table
export const communityEvents = pgTable("community_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // workshop, webinar, networking, support_group
  date: timestamp("date").notNull(),
  duration: integer("duration"), // Duration in minutes
  location: text("location"), // Physical location or "Online"
  isOnline: boolean("is_online").default(false),
  meetingLink: text("meeting_link"), // For online events
  organizerId: integer("organizer_id").notNull().references(() => users.id),
  maxAttendees: integer("max_attendees"),
  currentAttendees: integer("current_attendees").default(0),
  registrationRequired: boolean("registration_required").default(true),
  registrationDeadline: timestamp("registration_deadline"),
  tags: text("tags").array(),
  featuredImage: text("featured_image"),
  isPublic: boolean("is_public").default(true),
  status: text("status").default("upcoming"), // upcoming, ongoing, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event Registrations table (many-to-many relationship)
export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").notNull().references(() => communityEvents.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").default("registered"), // registered, attended, cancelled
  registeredAt: timestamp("registered_at").defaultNow(),
  notes: text("notes"), // Special requirements or notes
});

// Mentor Sessions table (for booking and tracking sessions)
export const mentorSessions = pgTable("mentor_sessions", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  menteeId: integer("mentee_id").notNull().references(() => users.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(60), // Duration in minutes
  status: text("status").default("scheduled"), // scheduled, completed, cancelled, no_show
  sessionType: text("session_type").default("consultation"), // consultation, follow_up, workshop
  notes: text("notes"), // Session notes
  menteeRating: integer("mentee_rating"), // 1-5 rating from mentee
  menteeReview: text("mentee_review"),
  mentorNotes: text("mentor_notes"), // Private notes for mentor
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loan Partner table - represents lending institutions/partners
export const loanPartners = pgTable("loan_partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  eligibilityCriteria: json("eligibility_criteria"), // JSONB for flexible criteria
  referralCommissionRate: decimal("referral_commission_rate", { precision: 5, scale: 4 }), // e.g., 0.0250 for 2.5%
  isActive: boolean("is_active").default(true),
  apiEndpoint: text("api_endpoint"), // For direct API integration
  contactEmail: text("contact_email"),
  website: text("website"),
  description: text("description"),
  logoUrl: text("logo_url"),
  supportedCountries: text("supported_countries").array(),
  minLoanAmount: decimal("min_loan_amount", { precision: 12, scale: 2 }),
  maxLoanAmount: decimal("max_loan_amount", { precision: 12, scale: 2 }),
  supportedCurrencies: text("supported_currencies").array().default(["USD"]),
  processingTimeRange: text("processing_time_range"), // e.g., "3-7 business days"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loan Pre-Qualification table - user loan application requests
export const loanPreQualifications = pgTable("loan_pre_qualifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  loanPurpose: text("loan_purpose").notNull(), // personal, business, home, auto, etc.
  amountRequested: decimal("amount_requested", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  creditScore: integer("credit_score"), // Optional credit score
  employmentStatus: text("employment_status").notNull(), // employed, self_employed, unemployed, retired
  monthlyIncome: decimal("monthly_income", { precision: 10, scale: 2 }),
  existingDebt: decimal("existing_debt", { precision: 10, scale: 2 }),
  collateralValue: decimal("collateral_value", { precision: 12, scale: 2 }),
  loanTerm: integer("loan_term"), // In months
  country: text("country"),
  state: text("state"),
  city: text("city"),
  additionalInfo: json("additional_info"), // Flexible field for extra data
  status: text("status").default("submitted"), // submitted, processing, matched, no_match, expired
  adminNotes: text("admin_notes"), // For admin review
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loan Referral table - tracks referrals to partners
export const loanReferrals = pgTable("loan_referrals", {
  id: serial("id").primaryKey(),
  preQualificationId: integer("pre_qualification_id").notNull().references(() => loanPreQualifications.id),
  partnerId: integer("partner_id").notNull().references(() => loanPartners.id),
  referralLink: text("referral_link").notNull().unique(), // Unique trackable link
  referralCode: text("referral_code").notNull().unique(), // Short tracking code
  referralStatus: text("referral_status").default("referred"), // referred, applied, approved, rejected, withdrawn
  applicationId: text("application_id"), // Partner's application ID
  approvedAmount: decimal("approved_amount", { precision: 12, scale: 2 }),
  approvedRate: decimal("approved_rate", { precision: 5, scale: 4 }), // Interest rate
  commissionEarned: decimal("commission_earned", { precision: 10, scale: 2 }),
  commissionPaid: boolean("commission_paid").default(false),
  partnerResponse: json("partner_response"), // Store partner webhook data
  referredAt: timestamp("referred_at").defaultNow(),
  appliedAt: timestamp("applied_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  lastStatusUpdate: timestamp("last_status_update").defaultNow(),
  notes: text("notes"),
});

// Financial Goals table - user-defined savings and financial targets
export const financialGoals = pgTable("financial_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  goalType: text("goal_type").notNull(), // savings, debt_payoff, investment, emergency_fund, vacation, home, car
  targetAmount: decimal("target_amount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).default("0.00"),
  currency: text("currency").default("USD"),
  targetDate: timestamp("target_date"),
  priority: text("priority").default("medium"), // high, medium, low
  category: text("category"), // housing, travel, education, retirement, etc.
  isActive: boolean("is_active").default(true),
  isCompleted: boolean("is_completed").default(false),
  completedAt: timestamp("completed_at"),
  monthlyContribution: decimal("monthly_contribution", { precision: 10, scale: 2 }),
  autoTransferEnabled: boolean("auto_transfer_enabled").default(false),
  linkedAccountId: integer("linked_account_id").references(() => accounts.id),
  reminderEnabled: boolean("reminder_enabled").default(true),
  reminderFrequency: text("reminder_frequency").default("weekly"), // daily, weekly, monthly
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Goal Progress Tracking table - historical progress data
export const goalProgress = pgTable("goal_progress", {
  id: serial("id").primaryKey(),
  goalId: integer("goal_id").notNull().references(() => financialGoals.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }),
  transactionId: integer("transaction_id").references(() => transactions.id),
  entryType: text("entry_type").default("manual"), // manual, automatic, transaction_linked
  notes: text("notes"),
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Job Listings table - job opportunities
export const jobListings = pgTable("job_listings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  description: text("description").notNull(),
  jobType: text("job_type").notNull(), // full-time, part-time, contract, freelance
  salaryMin: decimal("salary_min", { precision: 10, scale: 2 }),
  salaryMax: decimal("salary_max", { precision: 10, scale: 2 }),
  currency: text("currency").default("USD"),
  applicationLink: text("application_link").notNull(),
  requirements: text("requirements").array(),
  benefits: text("benefits").array(),
  remote: boolean("remote").default(false),
  experience: text("experience"), // entry, mid, senior
  industry: text("industry"),
  companySize: text("company_size"), // startup, small, medium, large
  postedDate: timestamp("posted_date").defaultNow(),
  expirationDate: timestamp("expiration_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Housing Listings table - accommodation options
export const housingListings = pgTable("housing_listings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id), // landlord/poster
  title: text("title").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  postalCode: text("postal_code"),
  rentAmount: decimal("rent_amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  propertyType: text("property_type").notNull(), // room, apartment, house, studio
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: decimal("bathrooms", { precision: 3, scale: 1 }).notNull(),
  furnished: boolean("furnished").default(false),
  utilitiesIncluded: boolean("utilities_included").default(false),
  petsAllowed: boolean("pets_allowed").default(false),
  availabilityDate: timestamp("availability_date").notNull(),
  description: text("description").notNull(),
  amenities: text("amenities").array(),
  photos: text("photos").array(), // URLs to images
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  area: decimal("area", { precision: 8, scale: 2 }), // square meters/feet
  deposit: decimal("deposit", { precision: 10, scale: 2 }),
  minimumStay: integer("minimum_stay"), // months
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  transactions: many(transactions),
  balanceHistory: many(balanceHistory),
  chatMessages: many(chatMessages),
  aiAssistantContext: many(aiAssistantContext),
  insights: many(insights),
  mentorProfile: many(mentors),
  organizedEvents: many(communityEvents),
  eventRegistrations: many(eventRegistrations),
  mentorSessions: many(mentorSessions),
  loanPreQualifications: many(loanPreQualifications),
  financialGoals: many(financialGoals),
  housingListings: many(housingListings),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [transactions.accountId],
    references: [accounts.id],
  }),
}));

export const balanceHistoryRelations = relations(balanceHistory, ({ one }) => ({
  user: one(users, {
    fields: [balanceHistory.userId],
    references: [users.id],
  }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const aiAssistantContextRelations = relations(aiAssistantContext, ({ one }) => ({
  user: one(users, {
    fields: [aiAssistantContext.userId],
    references: [users.id],
  }),
}));

export const insightsRelations = relations(insights, ({ one }) => ({
  author: one(users, {
    fields: [insights.authorId],
    references: [users.id],
  }),
}));

export const mentorsRelations = relations(mentors, ({ one, many }) => ({
  user: one(users, {
    fields: [mentors.userId],
    references: [users.id],
  }),
  sessions: many(mentorSessions),
}));

export const communityEventsRelations = relations(communityEvents, ({ one, many }) => ({
  organizer: one(users, {
    fields: [communityEvents.organizerId],
    references: [users.id],
  }),
  registrations: many(eventRegistrations),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one }) => ({
  event: one(communityEvents, {
    fields: [eventRegistrations.eventId],
    references: [communityEvents.id],
  }),
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id],
  }),
}));

export const mentorSessionsRelations = relations(mentorSessions, ({ one }) => ({
  mentor: one(mentors, {
    fields: [mentorSessions.mentorId],
    references: [mentors.id],
  }),
  mentee: one(users, {
    fields: [mentorSessions.menteeId],
    references: [users.id],
  }),
}));

export const loanPartnersRelations = relations(loanPartners, ({ many }) => ({
  referrals: many(loanReferrals),
}));

export const loanPreQualificationsRelations = relations(loanPreQualifications, ({ one, many }) => ({
  user: one(users, {
    fields: [loanPreQualifications.userId],
    references: [users.id],
  }),
  referrals: many(loanReferrals),
}));

export const loanReferralsRelations = relations(loanReferrals, ({ one }) => ({
  preQualification: one(loanPreQualifications, {
    fields: [loanReferrals.preQualificationId],
    references: [loanPreQualifications.id],
  }),
  partner: one(loanPartners, {
    fields: [loanReferrals.partnerId],
    references: [loanPartners.id],
  }),
}));

export const financialGoalsRelations = relations(financialGoals, ({ one, many }) => ({
  user: one(users, {
    fields: [financialGoals.userId],
    references: [users.id],
  }),
  linkedAccount: one(accounts, {
    fields: [financialGoals.linkedAccountId],
    references: [accounts.id],
  }),
  progress: many(goalProgress),
}));

export const goalProgressRelations = relations(goalProgress, ({ one }) => ({
  goal: one(financialGoals, {
    fields: [goalProgress.goalId],
    references: [financialGoals.id],
  }),
  transaction: one(transactions, {
    fields: [goalProgress.transactionId],
    references: [transactions.id],
  }),
}));

// Widget marketplace tables
export const widgetTypes = pgTable("widget_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  displayName: text("display_name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // financial, analytics, productivity, social, etc.
  version: text("version").default("1.0.0"),
  developer: text("developer").notNull(),
  icon: text("icon"), // Lucide icon name or URL
  previewImage: text("preview_image"),
  isActive: boolean("is_active").default(true),
  isPremium: boolean("is_premium").default(false),
  price: decimal("price", { precision: 10, scale: 2 }).default("0.00"),
  downloadCount: integer("download_count").default(0),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("0.00"),
  ratingCount: integer("rating_count").default(0),
  configSchema: json("config_schema").$type<Record<string, any>>(), // JSON schema for widget configuration
  permissions: text("permissions").array(), // required permissions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userWidgets = pgTable("user_widgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  widgetTypeId: integer("widget_type_id").notNull().references(() => widgetTypes.id, { onDelete: "cascade" }),
  position: json("position").$type<{ x: number; y: number; w: number; h: number }>().notNull(),
  config: json("config").$type<Record<string, any>>(), // widget-specific configuration
  isVisible: boolean("is_visible").default(true),
  title: text("title"), // custom title override
  refreshInterval: integer("refresh_interval").default(300), // seconds
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const widgetRatings = pgTable("widget_ratings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  widgetTypeId: integer("widget_type_id").notNull().references(() => widgetTypes.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull(), // 1-5 stars
  review: text("review"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dashboardLayouts = pgTable("dashboard_layouts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
  isPublic: boolean("is_public").default(false),
  layout: json("layout").$type<Array<{ i: string; x: number; y: number; w: number; h: number }>>().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Widget marketplace relations
export const widgetTypesRelations = relations(widgetTypes, ({ many }) => ({
  userWidgets: many(userWidgets),
  ratings: many(widgetRatings),
}));

export const userWidgetsRelations = relations(userWidgets, ({ one }) => ({
  user: one(users, {
    fields: [userWidgets.userId],
    references: [users.id],
  }),
  widgetType: one(widgetTypes, {
    fields: [userWidgets.widgetTypeId],
    references: [widgetTypes.id],
  }),
}));

export const widgetRatingsRelations = relations(widgetRatings, ({ one }) => ({
  user: one(users, {
    fields: [widgetRatings.userId],
    references: [users.id],
  }),
  widgetType: one(widgetTypes, {
    fields: [widgetRatings.widgetTypeId],
    references: [widgetTypes.id],
  }),
}));

export const dashboardLayoutsRelations = relations(dashboardLayouts, ({ one }) => ({
  user: one(users, {
    fields: [dashboardLayouts.userId],
    references: [users.id],
  }),
}));

// Widget marketplace Zod schemas
export const insertWidgetTypeSchema = createInsertSchema(widgetTypes);
export const insertUserWidgetSchema = createInsertSchema(userWidgets);
export const insertWidgetRatingSchema = createInsertSchema(widgetRatings);
export const insertDashboardLayoutSchema = createInsertSchema(dashboardLayouts);

export type InsertWidgetType = z.infer<typeof insertWidgetTypeSchema>;
export type InsertUserWidget = z.infer<typeof insertUserWidgetSchema>;
export type InsertWidgetRating = z.infer<typeof insertWidgetRatingSchema>;
export type InsertDashboardLayout = z.infer<typeof insertDashboardLayoutSchema>;

export type WidgetType = typeof widgetTypes.$inferSelect;
export type UserWidget = typeof userWidgets.$inferSelect;
export type WidgetRating = typeof widgetRatings.$inferSelect;
export type DashboardLayout = typeof dashboardLayouts.$inferSelect;

export const housingListingsRelations = relations(housingListings, ({ one }) => ({
  user: one(users, {
    fields: [housingListings.userId],
    references: [users.id],
  }),
}));

// Schemas
export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain uppercase, lowercase, number and special character"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  nationality: z.string().optional(),
  acceptTerms: z.boolean().refine(val => val === true, "Terms must be accepted"),
  acceptPrivacy: z.boolean().refine(val => val === true, "Privacy policy must be accepted"),
  marketingConsent: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  username: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phoneNumber: z.string().optional(),
  nationality: z.string().optional(),
  marketingConsent: z.boolean().optional(),
});

export const passwordRecoverySchema = z.object({
  email: z.string().email("Invalid email format"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, 
      "Password must contain uppercase, lowercase, number and special character"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  passwordHash: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  nationality: true,
  acceptTerms: true,
  acceptPrivacy: true,
  marketingConsent: true,
});

export const insertAccountSchema = createInsertSchema(accounts).pick({
  name: true,
  type: true,
  balance: true,
  currency: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  description: true,
  amount: true,
  type: true,
  category: true,
  accountId: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).pick({
  message: true,
  response: true,
  context: true,
  sessionId: true,
});

export const insertAIAssistantContextSchema = createInsertSchema(aiAssistantContext).pick({
  contextType: true,
  contextData: true,
  priority: true,
  isActive: true,
});

// Community schemas
export const insertInsightSchema = createInsertSchema(insights).pick({
  title: true,
  content: true,
  excerpt: true,
  category: true,
  tags: true,
  status: true,
  featuredImage: true,
  readTime: true,
  isPublic: true,
});

export const insertMentorSchema = createInsertSchema(mentors).pick({
  specialty: true,
  bio: true,
  experience: true,
  availability: true,
  hourlyRate: true,
  languages: true,
  certifications: true,
  linkedinUrl: true,
  isActive: true,
});

export const insertCommunityEventSchema = createInsertSchema(communityEvents).pick({
  title: true,
  description: true,
  category: true,
  date: true,
  duration: true,
  location: true,
  isOnline: true,
  meetingLink: true,
  maxAttendees: true,
  registrationRequired: true,
  registrationDeadline: true,
  tags: true,
  featuredImage: true,
  isPublic: true,
});

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).pick({
  status: true,
  notes: true,
});

export const insertMentorSessionSchema = createInsertSchema(mentorSessions).pick({
  scheduledAt: true,
  duration: true,
  sessionType: true,
  notes: true,
});

// Loan system schemas
export const loanPreQualificationSchema = z.object({
  loanPurpose: z.string().min(1, "Loan purpose is required"),
  amountRequested: z.string().min(1, "Loan amount is required"),
  currency: z.string().default("USD"),
  creditScore: z.number().min(300).max(850).optional(),
  employmentStatus: z.enum(["employed", "self_employed", "unemployed", "retired"]),
  monthlyIncome: z.string().optional(),
  existingDebt: z.string().optional(),
  collateralValue: z.string().optional(),
  loanTerm: z.number().min(1).max(360).optional(), // 1-360 months
  country: z.string().optional(),
  state: z.string().optional(),
  city: z.string().optional(),
  additionalInfo: z.any().optional(),
});

export const insertLoanPartnerSchema = createInsertSchema(loanPartners).pick({
  name: true,
  eligibilityCriteria: true,
  referralCommissionRate: true,
  isActive: true,
  apiEndpoint: true,
  contactEmail: true,
  website: true,
  description: true,
  logoUrl: true,
  supportedCountries: true,
  minLoanAmount: true,
  maxLoanAmount: true,
  supportedCurrencies: true,
  processingTimeRange: true,
});

export const insertLoanPreQualificationSchema = createInsertSchema(loanPreQualifications).pick({
  loanPurpose: true,
  amountRequested: true,
  currency: true,
  creditScore: true,
  employmentStatus: true,
  monthlyIncome: true,
  existingDebt: true,
  collateralValue: true,
  loanTerm: true,
  country: true,
  state: true,
  city: true,
  additionalInfo: true,
});

export const insertLoanReferralSchema = createInsertSchema(loanReferrals).pick({
  referralLink: true,
  referralCode: true,
  referralStatus: true,
  applicationId: true,
  approvedAmount: true,
  approvedRate: true,
  commissionEarned: true,
  commissionPaid: true,
  partnerResponse: true,
  notes: true,
});

// Loan system type exports
export type LoanPartner = typeof loanPartners.$inferSelect;
export type LoanPreQualification = typeof loanPreQualifications.$inferSelect;
export type LoanReferral = typeof loanReferrals.$inferSelect;
export type InsertLoanPartner = z.infer<typeof insertLoanPartnerSchema>;
export type InsertLoanPreQualification = z.infer<typeof insertLoanPreQualificationSchema>;
export type InsertLoanReferral = z.infer<typeof insertLoanReferralSchema>;
export type LoanPreQualificationForm = z.infer<typeof loanPreQualificationSchema>;

// ===== FINANCIAL GOALS SYSTEM =====

// Financial Goals schemas
export const createFinancialGoalSchema = z.object({
  title: z.string().min(1, "Goal title is required").max(100),
  description: z.string().optional(),
  goalType: z.enum(["savings", "debt_payoff", "investment", "emergency_fund", "vacation", "home", "car", "education", "retirement"]),
  targetAmount: z.string().min(1, "Target amount is required"),
  currency: z.string().default("USD"),
  targetDate: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  category: z.string().optional(),
  monthlyContribution: z.string().optional(),
  autoTransferEnabled: z.boolean().default(false),
  linkedAccountId: z.number().optional(),
  reminderEnabled: z.boolean().default(true),
  reminderFrequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  notes: z.string().optional(),
});

export const updateFinancialGoalSchema = createFinancialGoalSchema.partial();

export const insertFinancialGoalSchema = createInsertSchema(financialGoals).pick({
  title: true,
  description: true,
  goalType: true,
  targetAmount: true,
  currentAmount: true,
  currency: true,
  targetDate: true,
  priority: true,
  category: true,
  isActive: true,
  monthlyContribution: true,
  autoTransferEnabled: true,
  linkedAccountId: true,
  reminderEnabled: true,
  reminderFrequency: true,
  notes: true,
});

export const insertGoalProgressSchema = createInsertSchema(goalProgress).pick({
  amount: true,
  progressPercentage: true,
  transactionId: true,
  entryType: true,
  notes: true,
});

export const addGoalProgressSchema = z.object({
  goalId: z.number(),
  amount: z.string().min(1, "Amount is required"),
  entryType: z.enum(["manual", "automatic", "transaction_linked"]).default("manual"),
  notes: z.string().optional(),
});

// Financial Goals type exports
export type FinancialGoal = typeof financialGoals.$inferSelect;
export type GoalProgress = typeof goalProgress.$inferSelect;
export type InsertFinancialGoal = z.infer<typeof insertFinancialGoalSchema>;
export type InsertGoalProgress = z.infer<typeof insertGoalProgressSchema>;
export type CreateFinancialGoal = z.infer<typeof createFinancialGoalSchema>;
export type UpdateFinancialGoal = z.infer<typeof updateFinancialGoalSchema>;
export type AddGoalProgress = z.infer<typeof addGoalProgressSchema>;

// ===== JOB & HOUSING DISCOVERY SYSTEM =====

// Job Listing schemas
export const insertJobListingSchema = createInsertSchema(jobListings).pick({
  title: true,
  company: true,
  location: true,
  country: true,
  city: true,
  description: true,
  jobType: true,
  salaryMin: true,
  salaryMax: true,
  currency: true,
  applicationLink: true,
  requirements: true,
  benefits: true,
  remote: true,
  experience: true,
  industry: true,
  companySize: true,
  expirationDate: true,
});

export const searchJobsSchema = z.object({
  keywords: z.string().optional(),
  location: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  jobType: z.enum(["full-time", "part-time", "contract", "freelance"]).optional(),
  remote: z.boolean().optional(),
  experience: z.enum(["entry", "mid", "senior"]).optional(),
  industry: z.string().optional(),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

// Housing Listing schemas
export const insertHousingListingSchema = createInsertSchema(housingListings).pick({
  title: true,
  address: true,
  city: true,
  country: true,
  postalCode: true,
  rentAmount: true,
  currency: true,
  propertyType: true,
  bedrooms: true,
  bathrooms: true,
  furnished: true,
  utilitiesIncluded: true,
  petsAllowed: true,
  availabilityDate: true,
  description: true,
  amenities: true,
  photos: true,
  contactEmail: true,
  contactPhone: true,
  area: true,
  deposit: true,
  minimumStay: true,
});

export const searchHousingSchema = z.object({
  location: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  propertyType: z.enum(["room", "apartment", "house", "studio"]).optional(),
  minRent: z.string().optional(),
  maxRent: z.string().optional(),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  furnished: z.boolean().optional(),
  petsAllowed: z.boolean().optional(),
  utilitiesIncluded: z.boolean().optional(),
  availableFrom: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
  offset: z.number().min(0).default(0),
});

export const updateHousingListingSchema = createInsertSchema(housingListings).pick({
  title: true,
  address: true,
  city: true,
  country: true,
  postalCode: true,
  rentAmount: true,
  currency: true,
  propertyType: true,
  bedrooms: true,
  bathrooms: true,
  furnished: true,
  utilitiesIncluded: true,
  petsAllowed: true,
  availabilityDate: true,
  description: true,
  amenities: true,
  photos: true,
  contactEmail: true,
  contactPhone: true,
  area: true,
  deposit: true,
  minimumStay: true,
  isActive: true,
}).partial();

// Job & Housing type exports
export type JobListing = typeof jobListings.$inferSelect;
export type HousingListing = typeof housingListings.$inferSelect;
export type InsertJobListing = z.infer<typeof insertJobListingSchema>;
export type InsertHousingListing = z.infer<typeof insertHousingListingSchema>;
export type SearchJobsQuery = z.infer<typeof searchJobsSchema>;
export type SearchHousingQuery = z.infer<typeof searchHousingSchema>;
export type UpdateHousingListing = z.infer<typeof updateHousingListingSchema>;

// Validation schemas for API endpoints
export const createInsightSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(500, "Excerpt too long").optional(),
  category: z.enum(["migration", "finance", "legal", "housing", "employment"]),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().url().optional(),
  readTime: z.number().min(1).optional(),
  isPublic: z.boolean().default(true),
});

export const createMentorSchema = z.object({
  specialty: z.enum(["finance", "legal", "career", "housing", "immigration"]),
  bio: z.string().min(50, "Bio must be at least 50 characters").max(1000, "Bio too long"),
  experience: z.string().max(500, "Experience description too long").optional(),
  availability: z.object({
    timezone: z.string(),
    weekdays: z.array(z.object({
      day: z.string(),
      startTime: z.string(),
      endTime: z.string(),
    })),
    isActive: z.boolean(),
  }).optional(),
  hourlyRate: z.number().min(0).optional(),
  languages: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  linkedinUrl: z.string().url().optional(),
});

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().min(1, "Description is required"),
  category: z.enum(["workshop", "webinar", "networking", "support_group"]),
  date: z.string().datetime("Invalid date format"),
  duration: z.number().min(15, "Duration must be at least 15 minutes").optional(),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  meetingLink: z.string().url().optional(),
  maxAttendees: z.number().min(1).optional(),
  registrationRequired: z.boolean().default(true),
  registrationDeadline: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().url().optional(),
  isPublic: z.boolean().default(true),
});

export const bookMentorSessionSchema = z.object({
  mentorId: z.number().min(1, "Mentor ID is required"),
  scheduledAt: z.string().datetime("Invalid date format"),
  duration: z.number().min(30, "Session must be at least 30 minutes").max(180, "Session cannot exceed 3 hours"),
  sessionType: z.enum(["consultation", "follow_up", "workshop"]).default("consultation"),
  notes: z.string().max(500, "Notes too long").optional(),
});

export const registerEventSchema = z.object({
  eventId: z.number().min(1, "Event ID is required"),
  notes: z.string().max(500, "Notes too long").optional(),
});

// Types
export type User = typeof users.$inferSelect;
export type SafeUser = Omit<User, 'passwordHash' | 'passwordResetToken' | 'passwordResetExpires' | 'mfaBackupCodes'>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type BalanceHistory = typeof balanceHistory.$inferSelect;
export type UserAuditLog = typeof userAuditLogs.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type AIAssistantContext = typeof aiAssistantContext.$inferSelect;
export type InsertAIAssistantContext = z.infer<typeof insertAIAssistantContextSchema>;

// Community types
export type Insight = typeof insights.$inferSelect;
export type InsertInsight = z.infer<typeof insertInsightSchema>;
export type CreateInsight = z.infer<typeof createInsightSchema>;
export type Mentor = typeof mentors.$inferSelect;
export type InsertMentor = z.infer<typeof insertMentorSchema>;
export type CreateMentor = z.infer<typeof createMentorSchema>;
export type CommunityEvent = typeof communityEvents.$inferSelect;
export type InsertCommunityEvent = z.infer<typeof insertCommunityEventSchema>;
export type CreateEvent = z.infer<typeof createEventSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type RegisterEvent = z.infer<typeof registerEventSchema>;
export type MentorSession = typeof mentorSessions.$inferSelect;
export type InsertMentorSession = z.infer<typeof insertMentorSessionSchema>;
export type BookMentorSession = z.infer<typeof bookMentorSessionSchema>;