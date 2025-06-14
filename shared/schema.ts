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
  username: z.string().min(1, "Username is required"),
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