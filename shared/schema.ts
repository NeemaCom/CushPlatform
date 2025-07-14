import { pgTable, text, serial, integer, decimal, timestamp, boolean, json, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firebaseUid: text("firebase_uid").unique(),
  role: text("role").default("customer"), // customer, admin
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number"),
  nationality: text("nationality"),
  profilePicture: text("profile_picture"),
  gender: text("gender"), // male, female, other
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

// Loan Applications table
export const loanApplications = pgTable("loan_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  loanProviderId: integer("loan_provider_id").references(() => loanProviders.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").default("GBP"),
  purpose: text("purpose").notNull(),
  status: text("status").default("pending"), // pending, approved, rejected, under_review
  applicationData: json("application_data").$type<Record<string, any>>(),
  prequalificationScore: integer("prequalification_score"),
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  termMonths: integer("term_months"),
  monthlyPayment: decimal("monthly_payment", { precision: 10, scale: 2 }),
  submittedAt: timestamp("submitted_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loan Providers table
export const loanProviders = pgTable("loan_providers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  country: text("country").notNull(), // UK, Nigeria
  type: text("type").notNull(), // bank, fintech, microfinance, peer_to_peer
  description: text("description"),
  website: text("website"),
  phoneNumber: text("phone_number"),
  email: text("email"),
  logoUrl: text("logo_url"),
  minAmount: decimal("min_amount", { precision: 15, scale: 2 }),
  maxAmount: decimal("max_amount", { precision: 15, scale: 2 }),
  minInterestRate: decimal("min_interest_rate", { precision: 5, scale: 2 }),
  maxInterestRate: decimal("max_interest_rate", { precision: 5, scale: 2 }),
  minTermMonths: integer("min_term_months"),
  maxTermMonths: integer("max_term_months"),
  currencies: text("currencies").array(),
  eligibilityCriteria: json("eligibility_criteria").$type<Record<string, any>>(),
  requiredDocuments: text("required_documents").array(),
  processingTime: text("processing_time"),
  features: text("features").array(),
  rating: decimal("rating", { precision: 2, scale: 1 }),
  totalReviews: integer("total_reviews").default(0),
  isActive: boolean("is_active").default(true),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loan Prequalification table
export const loanPrequalifications = pgTable("loan_prequalifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  employmentStatus: text("employment_status").notNull(),
  monthlyIncome: decimal("monthly_income", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").default("GBP"),
  employmentType: text("employment_type"), // full_time, part_time, contract, self_employed
  companyName: text("company_name"),
  workExperience: integer("work_experience_months"),
  creditScore: integer("credit_score"),
  existingDebts: decimal("existing_debts", { precision: 15, scale: 2 }),
  monthlyExpenses: decimal("monthly_expenses", { precision: 15, scale: 2 }),
  residenceStatus: text("residence_status"), // citizen, permanent_resident, visa_holder
  residenceCountry: text("residence_country"),
  bankStatementMonths: integer("bank_statement_months"),
  collateralValue: decimal("collateral_value", { precision: 15, scale: 2 }),
  guarantorAvailable: boolean("guarantor_available").default(false),
  loanPurpose: text("loan_purpose"),
  preferredAmount: decimal("preferred_amount", { precision: 15, scale: 2 }),
  preferredTermMonths: integer("preferred_term_months"),
  prequalificationScore: integer("prequalification_score"),
  matchedProviders: json("matched_providers").$type<number[]>(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loan Reviews table
export const loanReviews = pgTable("loan_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  loanProviderId: integer("loan_provider_id").references(() => loanProviders.id),
  rating: integer("rating").notNull(), // 1-5 stars
  title: text("title"),
  review: text("review"),
  pros: text("pros").array(),
  cons: text("cons").array(),
  approvalTime: text("approval_time"),
  customerService: integer("customer_service_rating"), // 1-5
  interestRate: decimal("interest_rate", { precision: 5, scale: 2 }),
  isRecommended: boolean("is_recommended"),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Loan Favorites for user wishlist
export const loanFavorites = pgTable("loan_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  loanProviderId: integer("loan_provider_id").notNull().references(() => loanProviders.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Loan Application Drafts for save/resume functionality
export const loanApplicationDrafts = pgTable("loan_application_drafts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  loanProviderId: integer("loan_provider_id").notNull().references(() => loanProviders.id),
  draftData: json("draft_data").$type<Record<string, any>>().notNull(),
  stepCompleted: integer("step_completed").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced Loan Provider Reviews
export const loanProviderReviews = pgTable("loan_provider_reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  loanProviderId: integer("loan_provider_id").notNull().references(() => loanProviders.id),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  loanApplicationId: integer("loan_application_id").references(() => loanApplications.id),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community Insights table
export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  excerpt: text("excerpt"), // Short description for listings
  authorId: integer("author_id").notNull().references(() => users.id),
  category: text("category").notNull(), // migration, finance, legal, employment
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
  specialty: text("specialty").notNull(), // finance, legal, career, immigration
  bio: text("bio").notNull(),
  experience: text("experience"), // Years of experience or background
  profilePicture: text("profile_picture"), // Base64 encoded image data
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

// Mentor Availability Slots
export const mentorAvailability = pgTable("mentor_availability", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sunday-Saturday)
  startTime: text("start_time").notNull(), // Format: "09:00"
  endTime: text("end_time").notNull(), // Format: "17:00"
  timezone: text("timezone").default("UTC"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mentor Booking Slots (specific available time slots)
export const mentorBookingSlots = pgTable("mentor_booking_slots", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  dateTime: timestamp("date_time").notNull(),
  duration: integer("duration").default(60), // Duration in minutes
  isBooked: boolean("is_booked").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mentor Sessions table (for booking and tracking sessions)
export const mentorSessions = pgTable("mentor_sessions", {
  id: serial("id").primaryKey(),
  mentorId: integer("mentor_id").notNull().references(() => mentors.id),
  menteeId: integer("mentee_id").notNull().references(() => users.id),
  bookingSlotId: integer("booking_slot_id").references(() => mentorBookingSlots.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").default(60), // Duration in minutes
  status: text("status").default("scheduled"), // scheduled, completed, cancelled, no_show
  sessionType: text("session_type").default("consultation"), // consultation, follow_up, workshop
  topic: text("topic"), // Session topic or focus area
  notes: text("notes"), // Session notes
  menteeRating: integer("mentee_rating"), // 1-5 rating from mentee
  menteeReview: text("mentee_review"),
  mentorNotes: text("mentor_notes"), // Private notes for mentor
  cancelledBy: integer("cancelled_by"), // User ID who cancelled
  cancellationReason: text("cancellation_reason"),
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
  category: text("category"), // travel, education, retirement, etc.
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

// Achievement Badges System
export const achievementBadges = pgTable("achievement_badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull(), // emoji or icon name
  category: text("category").notNull(), // savings, spending, goals, streaks, milestones
  criteria: json("criteria").$type<{
    type: string; // amount_saved, goal_completed, spending_streak, etc.
    threshold?: number;
    duration?: string; // days, weeks, months
    conditions?: Record<string, any>;
  }>().notNull(),
  rarity: text("rarity").notNull().default("common"), // common, rare, epic, legendary
  points: integer("points").notNull().default(10),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: integer("badge_id").notNull().references(() => achievementBadges.id),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
  progress: json("progress").$type<Record<string, any>>(), // current progress data
  isVisible: boolean("is_visible").default(true),
  notificationSent: boolean("notification_sent").default(false),
});

export const achievementProgress = pgTable("achievement_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  badgeId: integer("badge_id").notNull().references(() => achievementBadges.id),
  currentValue: decimal("current_value", { precision: 10, scale: 2 }).default("0"),
  targetValue: decimal("target_value", { precision: 10, scale: 2 }).notNull(),
  progressData: json("progress_data").$type<Record<string, any>>(),
  lastUpdated: timestamp("last_updated").defaultNow(),
  isCompleted: boolean("is_completed").default(false),
});

// Cush Credit Passport - Cross-border credit profiles
export const creditProfiles = pgTable("credit_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  novaCreditReportId: text("nova_credit_report_id"),
  novaCreditScore: integer("nova_credit_score"),
  lenddoEFLScore: integer("lenddo_efl_score"),
  cushCreditScore: integer("cush_credit_score"),
  status: text("status").default("pending"), // pending, complete, error
  lastUpdated: timestamp("last_updated").defaultNow(),
  consentGiven: boolean("consent_given").default(false),
  consentDate: timestamp("consent_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit Report Data - Encrypted storage of provider data
export const creditReportData = pgTable("credit_report_data", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  creditProfileId: integer("credit_profile_id").notNull().references(() => creditProfiles.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(), // nova_credit, lenddo_efl
  rawData: json("raw_data").$type<Record<string, any>>(), // Encrypted at application level
  processedData: json("processed_data").$type<Record<string, any>>(), // Encrypted at application level
  reportType: text("report_type"), // credit_report, alternative_score, employment_verification
  reportStatus: text("report_status").default("processing"), // processing, complete, error
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Credit Profile Audit Log - Track all access and modifications
export const creditProfileAuditLog = pgTable("credit_profile_audit_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  creditProfileId: integer("credit_profile_id").references(() => creditProfiles.id),
  action: text("action").notNull(), // consent_given, report_requested, score_calculated, data_accessed
  provider: text("provider"), // nova_credit, lenddo_efl, cush_internal
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
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
  loanApplications: many(loanApplications),
  loanReviews: many(loanReviews),
  financialGoals: many(financialGoals),
  userAchievements: many(userAchievements),
  achievementProgress: many(achievementProgress),
  creditProfiles: many(creditProfiles),
  creditReportData: many(creditReportData),
  creditProfileAuditLog: many(creditProfileAuditLog),
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

export const creditProfilesRelations = relations(creditProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [creditProfiles.userId],
    references: [users.id],
  }),
  creditReportData: many(creditReportData),
}));

export const creditReportDataRelations = relations(creditReportData, ({ one }) => ({
  user: one(users, {
    fields: [creditReportData.userId],
    references: [users.id],
  }),
  creditProfile: one(creditProfiles, {
    fields: [creditReportData.creditProfileId],
    references: [creditProfiles.id],
  }),
}));

export const creditProfileAuditLogRelations = relations(creditProfileAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [creditProfileAuditLog.userId],
    references: [users.id],
  }),
  creditProfile: one(creditProfiles, {
    fields: [creditProfileAuditLog.creditProfileId],
    references: [creditProfiles.id],
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

// Loan Relations
export const loanProvidersRelations = relations(loanProviders, ({ many }) => ({
  applications: many(loanApplications),
  reviews: many(loanReviews),
}));

export const loanApplicationsRelations = relations(loanApplications, ({ one }) => ({
  user: one(users, {
    fields: [loanApplications.userId],
    references: [users.id],
  }),
  provider: one(loanProviders, {
    fields: [loanApplications.loanProviderId],
    references: [loanProviders.id],
  }),
}));

export const loanPrequalificationsRelations = relations(loanPrequalifications, ({ one }) => ({
  user: one(users, {
    fields: [loanPrequalifications.userId],
    references: [users.id],
  }),
}));

export const loanReviewsRelations = relations(loanReviews, ({ one }) => ({
  user: one(users, {
    fields: [loanReviews.userId],
    references: [users.id],
  }),
  provider: one(loanProviders, {
    fields: [loanReviews.loanProviderId],
    references: [loanProviders.id],
  }),
}));

export const loanFavoritesRelations = relations(loanFavorites, ({ one }) => ({
  user: one(users, {
    fields: [loanFavorites.userId],
    references: [users.id],
  }),
  provider: one(loanProviders, {
    fields: [loanFavorites.loanProviderId],
    references: [loanProviders.id],
  }),
}));

export const loanApplicationDraftsRelations = relations(loanApplicationDrafts, ({ one }) => ({
  user: one(users, {
    fields: [loanApplicationDrafts.userId],
    references: [users.id],
  }),
  provider: one(loanProviders, {
    fields: [loanApplicationDrafts.loanProviderId],
    references: [loanProviders.id],
  }),
}));

export const loanProviderReviewsRelations = relations(loanProviderReviews, ({ one }) => ({
  user: one(users, {
    fields: [loanProviderReviews.userId],
    references: [users.id],
  }),
  provider: one(loanProviders, {
    fields: [loanProviderReviews.loanProviderId],
    references: [loanProviders.id],
  }),
  application: one(loanApplications, {
    fields: [loanProviderReviews.loanApplicationId],
    references: [loanApplications.id],
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

// Achievement Relations
export const achievementBadgesRelations = relations(achievementBadges, ({ many }) => ({
  userAchievements: many(userAchievements),
  achievementProgress: many(achievementProgress),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  badge: one(achievementBadges, {
    fields: [userAchievements.badgeId],
    references: [achievementBadges.id],
  }),
}));

export const achievementProgressRelations = relations(achievementProgress, ({ one }) => ({
  user: one(users, {
    fields: [achievementProgress.userId],
    references: [users.id],
  }),
  badge: one(achievementBadges, {
    fields: [achievementProgress.badgeId],
    references: [achievementBadges.id],
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
  email: z.string().email("Valid email is required").optional(),
  username: z.string().min(1, "Username or email is required").optional(),
  password: z.string().min(1, "Password is required"),
}).refine(data => data.email || data.username, {
  message: "Either email or username is required",
  path: ["email"]
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, "First name is required").optional(),
  lastName: z.string().min(1, "Last name is required").optional(),
  phoneNumber: z.string().optional(),
  nationality: z.string().optional(),
  profilePicture: z.string().optional(),
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
  profilePicture: true,
  acceptTerms: true,
  acceptPrivacy: true,
  marketingConsent: true,
});

// Loan Schemas
export const loanPrequalificationSchema = createInsertSchema(loanPrequalifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loanApplicationSchema = createInsertSchema(loanApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  processedAt: true,
  approvedAt: true,
  rejectedAt: true,
});

export const loanProviderSchema = createInsertSchema(loanProviders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loanReviewSchema = createInsertSchema(loanReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loanFavoriteSchema = createInsertSchema(loanFavorites).omit({
  id: true,
  createdAt: true,
});

export const loanApplicationDraftSchema = createInsertSchema(loanApplicationDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const loanProviderReviewSchema = createInsertSchema(loanProviderReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoanPrequalification = typeof loanPrequalifications.$inferSelect;
export type InsertLoanPrequalification = z.infer<typeof loanPrequalificationSchema>;
export type LoanApplication = typeof loanApplications.$inferSelect;
export type InsertLoanApplication = z.infer<typeof loanApplicationSchema>;
export type LoanFavorite = typeof loanFavorites.$inferSelect;
export type InsertLoanFavorite = z.infer<typeof loanFavoriteSchema>;
export type LoanApplicationDraft = typeof loanApplicationDrafts.$inferSelect;
export type InsertLoanApplicationDraft = z.infer<typeof loanApplicationDraftSchema>;
export type LoanProviderReview = typeof loanProviderReviews.$inferSelect;
export type InsertLoanProviderReview = z.infer<typeof loanProviderReviewSchema>;
export type LoanProvider = typeof loanProviders.$inferSelect;
export type InsertLoanProvider = z.infer<typeof loanProviderSchema>;
export type LoanReview = typeof loanReviews.$inferSelect;
export type InsertLoanReview = z.infer<typeof loanReviewSchema>;

// Railsr Embedded Finance Tables
export const railsrConfig = pgTable("railsr_config", {
  id: serial("id").primaryKey(),
  environment: text("environment").notNull(), // sandbox, production
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  webhookSecret: text("webhook_secret"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const railsrEndusers = pgTable("railsr_endusers", {
  id: serial("id").primaryKey(),
  cushUserId: text("cush_user_id").notNull(), // Reference to Cush user
  railsrEnduserId: text("railsr_enduser_id").notNull().unique(), // Railsr's enduser ID
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  status: text("status").default("active"), // active, inactive, suspended
  kycStatus: text("kyc_status").default("pending"), // pending, approved, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const railsrWallets = pgTable("railsr_wallets", {
  id: serial("id").primaryKey(),
  railsrWalletId: text("railsr_wallet_id").notNull().unique(), // Railsr's wallet ID
  railsrEnduserId: text("railsr_enduser_id").notNull(), // Reference to Railsr enduser
  currency: text("currency").notNull().default("GBP"),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
  status: text("status").default("active"), // active, inactive, suspended
  type: text("type").default("ledger"), // ledger, iban, etc.
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const railsrCards = pgTable("railsr_cards", {
  id: serial("id").primaryKey(),
  railsrCardId: text("railsr_card_id").notNull().unique(), // Railsr's card ID
  railsrWalletId: text("railsr_wallet_id").notNull(), // Reference to Railsr wallet
  type: text("type").notNull(), // virtual, physical
  status: text("status").default("inactive"), // inactive, active, suspended, cancelled
  cardholderName: text("cardholder_name").notNull(),
  lastFourDigits: text("last_four_digits"), // For display purposes
  expiryDate: text("expiry_date"), // MM/YY format
  limits: json("limits").$type<{
    daily?: number;
    monthly?: number;
    transaction?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const railsrTransactions = pgTable("railsr_transactions", {
  id: serial("id").primaryKey(),
  railsrTransactionId: text("railsr_transaction_id").notNull().unique(), // Railsr's transaction ID
  railsrWalletId: text("railsr_wallet_id").notNull(), // Reference to Railsr wallet
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // transfer, payment, load, etc.
  status: text("status").default("pending"), // pending, completed, failed, cancelled
  reference: text("reference"),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Railsr Relations
export const railsrEndusersRelations = relations(railsrEndusers, ({ many }) => ({
  wallets: many(railsrWallets),
}));

export const railsrWalletsRelations = relations(railsrWallets, ({ one, many }) => ({
  enduser: one(railsrEndusers, {
    fields: [railsrWallets.railsrEnduserId],
    references: [railsrEndusers.railsrEnduserId],
  }),
  cards: many(railsrCards),
  transactions: many(railsrTransactions),
}));

export const railsrCardsRelations = relations(railsrCards, ({ one }) => ({
  wallet: one(railsrWallets, {
    fields: [railsrCards.railsrWalletId],
    references: [railsrWallets.railsrWalletId],
  }),
}));

export const railsrTransactionsRelations = relations(railsrTransactions, ({ one }) => ({
  wallet: one(railsrWallets, {
    fields: [railsrTransactions.railsrWalletId],
    references: [railsrWallets.railsrWalletId],
  }),
}));

// Railsr Schemas
export const railsrEnduserSchema = createInsertSchema(railsrEndusers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const railsrWalletSchema = createInsertSchema(railsrWallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const railsrCardSchema = createInsertSchema(railsrCards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const railsrTransactionSchema = createInsertSchema(railsrTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Railsr Types
export type RailsrEnduser = typeof railsrEndusers.$inferSelect;
export type InsertRailsrEnduser = z.infer<typeof railsrEnduserSchema>;
export type RailsrWallet = typeof railsrWallets.$inferSelect;
export type InsertRailsrWallet = z.infer<typeof railsrWalletSchema>;
export type RailsrCard = typeof railsrCards.$inferSelect;
export type InsertRailsrCard = z.infer<typeof railsrCardSchema>;
export type RailsrTransaction = typeof railsrTransactions.$inferSelect;
export type InsertRailsrTransaction = z.infer<typeof railsrTransactionSchema>;

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

// ===== SUPPORT SYSTEM =====

// Support Tickets
export const supportTickets = pgTable("support_tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  ticketNumber: text("ticket_number").notNull().unique(),
  category: text("category").notNull(), // "technical", "billing", "account", "feature_request", "bug_report", "general"
  priority: text("priority").notNull().default("medium"), // "low", "medium", "high", "urgent"
  status: text("status").notNull().default("open"), // "open", "in_progress", "resolved", "closed"
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  attachments: text("attachments").array(),
  assignedTo: integer("assigned_to").references(() => users.id),
  resolution: text("resolution"),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support Ticket Messages
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id),
  senderId: integer("sender_id").references(() => users.id),
  message: text("message").notNull(),
  isInternal: boolean("is_internal").default(false),
  attachments: text("attachments").array(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Feedback
export const userFeedback = pgTable("user_feedback", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  feedbackType: text("feedback_type").notNull(), // "feature_request", "bug_report", "improvement", "compliment", "complaint"
  category: text("category").notNull(), // "ui_ux", "performance", "security", "functionality", "content", "general"
  title: text("title").notNull(),
  message: text("message").notNull(),
  rating: integer("rating"), // 1-5 star rating
  pageUrl: text("page_url"),
  userAgent: text("user_agent"),
  attachments: text("attachments").array(),
  status: text("status").notNull().default("pending"), // "pending", "reviewed", "implemented", "rejected"
  adminNotes: text("admin_notes"),
  implementedAt: timestamp("implemented_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// FAQ Articles
export const faqArticles = pgTable("faq_articles", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  tags: text("tags").array(),
  viewCount: integer("view_count").default(0),
  isHelpful: integer("is_helpful").default(0),
  notHelpful: integer("not_helpful").default(0),
  isPublic: boolean("is_public").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Support Relations
export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
  }),
  assignedUser: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id],
  }),
  messages: many(supportTicketMessages),
}));

export const supportTicketMessagesRelations = relations(supportTicketMessages, ({ one }) => ({
  ticket: one(supportTickets, {
    fields: [supportTicketMessages.ticketId],
    references: [supportTickets.id],
  }),
  sender: one(users, {
    fields: [supportTicketMessages.senderId],
    references: [users.id],
  }),
}));

export const userFeedbackRelations = relations(userFeedback, ({ one }) => ({
  user: one(users, {
    fields: [userFeedback.userId],
    references: [users.id],
  }),
}));

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

// Support System Schemas
export const createSupportTicketSchema = z.object({
  category: z.enum(["technical", "billing", "account", "feature_request", "bug_report", "general"]),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  subject: z.string().min(1, "Subject is required").max(200),
  description: z.string().min(1, "Description is required").max(5000),
  attachments: z.array(z.string()).optional(),
});

export const updateSupportTicketSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.number().optional(),
  resolution: z.string().optional(),
});

export const createSupportTicketMessageSchema = z.object({
  ticketId: z.number(),
  message: z.string().min(1, "Message is required").max(5000),
  isInternal: z.boolean().default(false),
  attachments: z.array(z.string()).optional(),
});

export const createUserFeedbackSchema = z.object({
  feedbackType: z.enum(["feature_request", "bug_report", "improvement", "compliment", "complaint"]),
  category: z.enum(["ui_ux", "performance", "security", "functionality", "content", "general"]),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  rating: z.number().min(1).max(5).optional(),
  pageUrl: z.string().optional(),
  attachments: z.array(z.string()).optional(),
});

export const createFaqArticleSchema = z.object({
  category: z.string().min(1, "Category is required"),
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export const updateFaqArticleSchema = createFaqArticleSchema.partial();

// Support System Type Exports
export type SupportTicket = typeof supportTickets.$inferSelect;
export type SupportTicketMessage = typeof supportTicketMessages.$inferSelect;
export type UserFeedback = typeof userFeedback.$inferSelect;
export type FaqArticle = typeof faqArticles.$inferSelect;
export type CreateSupportTicket = z.infer<typeof createSupportTicketSchema>;
export type UpdateSupportTicket = z.infer<typeof updateSupportTicketSchema>;
export type CreateSupportTicketMessage = z.infer<typeof createSupportTicketMessageSchema>;
export type CreateUserFeedback = z.infer<typeof createUserFeedbackSchema>;
export type CreateFaqArticle = z.infer<typeof createFaqArticleSchema>;
export type UpdateFaqArticle = z.infer<typeof updateFaqArticleSchema>;

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

// ===== CUSH WALLET & REMITTANCE SYSTEM =====

// Cush Wallet table
export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  currency: text("currency").notNull().default("USD"),
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  availableBalance: decimal("available_balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  pendingBalance: decimal("pending_balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("is_active").default(true),
  isFrozen: boolean("is_frozen").default(false),
  dailyLimit: decimal("daily_limit", { precision: 15, scale: 2 }).default("5000.00"),
  monthlyLimit: decimal("monthly_limit", { precision: 15, scale: 2 }).default("25000.00"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet Transactions table
export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").notNull().references(() => wallets.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // deposit, withdrawal, transfer_out, transfer_in, fee, refund
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  description: text("description").notNull(),
  reference: text("reference"), // external reference number
  status: text("status").notNull().default("pending"), // pending, completed, failed, cancelled
  balanceBefore: decimal("balance_before", { precision: 15, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 15, scale: 2 }).notNull(),
  metadata: json("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Remittance Transactions table
export const remittanceTransactions = pgTable("remittance_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  walletId: integer("wallet_id").references(() => wallets.id),
  cymonzTransactionId: text("cymonz_transaction_id"), // Cymonz reference
  cymonzRedirectUrl: text("cymonz_redirect_url"), // Cymonz redirect URL
  
  // Sender Information
  senderName: text("sender_name").notNull(),
  senderEmail: text("sender_email").notNull(),
  senderPhone: text("sender_phone"),
  senderAddress: text("sender_address"),
  senderCountry: text("sender_country").notNull(),
  senderIdType: text("sender_id_type"), // passport, national_id, drivers_license
  senderIdNumber: text("sender_id_number"),
  
  // Recipient Information
  recipientName: text("recipient_name").notNull(),
  recipientEmail: text("recipient_email"),
  recipientPhone: text("recipient_phone"),
  recipientAddress: text("recipient_address"),
  recipientCountry: text("recipient_country").notNull(),
  recipientBankName: text("recipient_bank_name"),
  recipientBankCode: text("recipient_bank_code"),
  recipientAccountNumber: text("recipient_account_number"),
  recipientAccountName: text("recipient_account_name"),
  
  // Transaction Details
  sendAmount: decimal("send_amount", { precision: 15, scale: 2 }).notNull(),
  sendCurrency: text("send_currency").notNull(),
  receiveAmount: decimal("receive_amount", { precision: 15, scale: 2 }),
  receiveCurrency: text("receive_currency").notNull(),
  exchangeRate: decimal("exchange_rate", { precision: 10, scale: 6 }),
  fees: decimal("fees", { precision: 15, scale: 2 }).notNull().default("0.00"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  
  // Status and Tracking
  status: text("status").notNull().default("initiated"), // initiated, pending, processing, completed, failed, cancelled, refunded
  paymentMethod: text("payment_method"), // wallet, card, bank_transfer
  deliveryMethod: text("delivery_method"), // bank_transfer, cash_pickup, mobile_money
  purpose: text("purpose"), // family_support, business, education, etc.
  
  // Timestamps
  initiatedAt: timestamp("initiated_at").defaultNow(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  failedAt: timestamp("failed_at"),
  
  // Metadata
  cymonzData: json("cymonz_data").$type<Record<string, any>>(),
  complianceData: json("compliance_data").$type<Record<string, any>>(),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Remittance Recipients table (for saved recipients)
export const remittanceRecipients = pgTable("remittance_recipients", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nickname: text("nickname").notNull(), // User-friendly name
  
  // Recipient Details
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  country: text("country").notNull(),
  
  // Banking Details
  bankName: text("bank_name"),
  bankCode: text("bank_code"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  swiftCode: text("swift_code"),
  
  // Delivery Options
  deliveryMethod: text("delivery_method"), // bank_transfer, cash_pickup, mobile_money
  
  // Metadata
  isActive: boolean("is_active").default(true),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cymonz Configuration table
export const cymonzConfig = pgTable("cymonz_config", {
  id: serial("id").primaryKey(),
  environment: text("environment").notNull(), // sandbox, production
  baseUrl: text("base_url").notNull(),
  apiKey: text("api_key").notNull(),
  secretKey: text("secret_key").notNull(),
  webhookUrl: text("webhook_url"),
  callbackUrl: text("callback_url"),
  partnerCode: text("partner_code"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet and Remittance Relations
export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
  transactions: many(walletTransactions),
  remittances: many(remittanceTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, {
    fields: [walletTransactions.walletId],
    references: [wallets.id],
  }),
  user: one(users, {
    fields: [walletTransactions.userId],
    references: [users.id],
  }),
}));

export const remittanceTransactionsRelations = relations(remittanceTransactions, ({ one }) => ({
  user: one(users, {
    fields: [remittanceTransactions.userId],
    references: [users.id],
  }),
  wallet: one(wallets, {
    fields: [remittanceTransactions.walletId],
    references: [wallets.id],
  }),
}));

export const remittanceRecipientsRelations = relations(remittanceRecipients, ({ one }) => ({
  user: one(users, {
    fields: [remittanceRecipients.userId],
    references: [users.id],
  }),
}));

// Wallet and Remittance Schemas
export const walletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const walletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const remittanceTransactionSchema = createInsertSchema(remittanceTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  initiatedAt: true,
  processedAt: true,
  completedAt: true,
  failedAt: true,
});

export const remittanceRecipientSchema = createInsertSchema(remittanceRecipients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
});

// Remittance Form Schemas
export const initiateRemittanceSchema = z.object({
  recipientId: z.number().optional(),
  senderName: z.string().min(1, "Sender name is required"),
  senderEmail: z.string().email("Valid email required"),
  senderPhone: z.string().optional(),
  senderAddress: z.string().optional(),
  senderCountry: z.string().min(1, "Sender country is required"),
  senderIdType: z.enum(["passport", "national_id", "drivers_license"]).optional(),
  senderIdNumber: z.string().optional(),
  
  recipientName: z.string().min(1, "Recipient name is required"),
  recipientEmail: z.string().email().optional(),
  recipientPhone: z.string().optional(),
  recipientAddress: z.string().optional(),
  recipientCountry: z.string().min(1, "Recipient country is required"),
  recipientBankName: z.string().optional(),
  recipientBankCode: z.string().optional(),
  recipientAccountNumber: z.string().optional(),
  recipientAccountName: z.string().optional(),
  
  sendAmount: z.string().min(1, "Send amount is required"),
  sendCurrency: z.string().min(1, "Send currency is required"),
  receiveCurrency: z.string().min(1, "Receive currency is required"),
  paymentMethod: z.enum(["wallet", "card", "bank_transfer"]).default("wallet"),
  deliveryMethod: z.enum(["bank_transfer", "cash_pickup", "mobile_money"]).default("bank_transfer"),
  purpose: z.string().optional(),
});

export const saveRecipientSchema = z.object({
  nickname: z.string().min(1, "Nickname is required"),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  bankName: z.string().optional(),
  bankCode: z.string().optional(),
  accountNumber: z.string().optional(),
  accountName: z.string().optional(),
  swiftCode: z.string().optional(),
  deliveryMethod: z.enum(["bank_transfer", "cash_pickup", "mobile_money"]).default("bank_transfer"),
});

// Wallet and Remittance Type Exports
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof walletSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof walletTransactionSchema>;
export type RemittanceTransaction = typeof remittanceTransactions.$inferSelect;
export type InsertRemittanceTransaction = z.infer<typeof remittanceTransactionSchema>;
export type RemittanceRecipient = typeof remittanceRecipients.$inferSelect;
export type InsertRemittanceRecipient = z.infer<typeof remittanceRecipientSchema>;
export type CymonzConfig = typeof cymonzConfig.$inferSelect;
export type InitiateRemittance = z.infer<typeof initiateRemittanceSchema>;
export type SaveRecipient = z.infer<typeof saveRecipientSchema>;

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





// Job type exports
export type JobListing = typeof jobListings.$inferSelect;
export type InsertJobListing = z.infer<typeof insertJobListingSchema>;
export type SearchJobsQuery = z.infer<typeof searchJobsSchema>;

// Validation schemas for API endpoints
export const createInsightSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  content: z.string().min(1, "Content is required"),
  excerpt: z.string().max(500, "Excerpt too long").optional(),
  category: z.enum(["migration", "finance", "legal", "employment"]),
  tags: z.array(z.string()).optional(),
  featuredImage: z.string().url().optional(),
  readTime: z.number().min(1).optional(),
  isPublic: z.boolean().default(true),
});

export const createMentorSchema = z.object({
  specialty: z.enum(["finance", "legal", "career", "immigration"]),
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
export type MentorAvailability = typeof mentorAvailability.$inferSelect;
export type MentorBookingSlot = typeof mentorBookingSlots.$inferSelect;

// ===== ACHIEVEMENT BADGES SYSTEM =====

// Achievement Badges schemas
export const insertAchievementBadgeSchema = createInsertSchema(achievementBadges).pick({
  name: true,
  title: true,
  description: true,
  icon: true,
  category: true,
  criteria: true,
  rarity: true,
  points: true,
  isActive: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).pick({
  badgeId: true,
  progress: true,
  isVisible: true,
  notificationSent: true,
});

export const insertAchievementProgressSchema = createInsertSchema(achievementProgress).pick({
  badgeId: true,
  currentValue: true,
  targetValue: true,
  progressData: true,
  isCompleted: true,
});

// Achievement types
export type AchievementBadge = typeof achievementBadges.$inferSelect;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type AchievementProgress = typeof achievementProgress.$inferSelect;
export type InsertAchievementBadge = z.infer<typeof insertAchievementBadgeSchema>;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type InsertAchievementProgress = z.infer<typeof insertAchievementProgressSchema>;

// ===== ADMIN FUNCTIONS SYSTEM =====

// Admin action logs table
export const adminActionLogs = pgTable("admin_action_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id),
  action: text("action").notNull(), // user_delete, user_restrict, user_activate, etc.
  targetUserId: integer("target_user_id").references(() => users.id),
  details: json("details"), // Additional action details
  createdAt: timestamp("created_at").defaultNow(),
});

// User restrictions table
export const userRestrictions = pgTable("user_restrictions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  restrictionType: text("restriction_type").notNull(), // account_suspended, feature_limited, etc.
  reason: text("reason").notNull(),
  restrictedBy: integer("restricted_by").references(() => users.id),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// System metrics table
export const systemMetrics = pgTable("system_metrics", {
  id: serial("id").primaryKey(),
  metric: text("metric").notNull(), // active_users, total_transactions, etc.
  value: text("value").notNull(),
  period: text("period").notNull(), // daily, weekly, monthly
  recordedAt: timestamp("recorded_at").defaultNow(),
});

// Admin schemas
export const adminUserUpdateSchema = z.object({
  role: z.enum(["customer", "admin"]).optional(),
  isEmailVerified: z.boolean().optional(),
  isPhoneVerified: z.boolean().optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  nationality: z.string().optional(),
});

export const restrictUserSchema = z.object({
  restrictionType: z.enum(["account_suspended", "feature_limited", "login_restricted", "transaction_blocked"]),
  reason: z.string().min(1, "Reason is required"),
  expiresAt: z.string().datetime().optional(),
});

export const adminActionLogSchema = z.object({
  action: z.string().min(1),
  targetUserId: z.number().optional(),
  details: z.any().optional(),
});

// Admin type exports
export type AdminActionLog = typeof adminActionLogs.$inferSelect;
export type UserRestriction = typeof userRestrictions.$inferSelect;
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>;
export type RestrictUser = z.infer<typeof restrictUserSchema>;
export type AdminActionLogData = z.infer<typeof adminActionLogSchema>;