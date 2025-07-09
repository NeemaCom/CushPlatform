import { 
  users, 
  accounts, 
  transactions, 
  balanceHistory, 
  userAuditLogs,
  chatMessages,
  aiAssistantContext,
  insights,
  mentors,
  communityEvents,
  eventRegistrations,
  mentorSessions,
  loanPartners,
  loanPreQualifications,
  loanReferrals,
  financialGoals,
  goalProgress,
  jobListings,

  type User, 
  type SafeUser,
  type InsertUser,
  type Account,
  type InsertAccount,
  type Transaction,
  type InsertTransaction,
  type BalanceHistory,
  type UserAuditLog,
  type ChatMessage,
  type InsertChatMessage,
  type AIAssistantContext,
  type InsertAIAssistantContext,
  type Insight,
  type InsertInsight,
  type Mentor,
  type InsertMentor,
  type CommunityEvent,
  type InsertCommunityEvent,
  type EventRegistration,
  type InsertEventRegistration,
  type MentorSession,
  type InsertMentorSession,
  type LoanPartner,
  type InsertLoanPartner,
  type LoanPreQualification,
  type InsertLoanPreQualification,
  type LoanReferral,
  type InsertLoanReferral,
  type FinancialGoal,
  type InsertFinancialGoal,
  type GoalProgress,
  type InsertGoalProgress,
  type JobListing,

  type InsertJobListing,
  type SearchJobsQuery,

} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, gte, lte, sql } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  deleteUser(id: number): Promise<void>;
  
  // Account management
  getAccountsByUserId(userId: number): Promise<Account[]>;
  createAccount(insertAccount: InsertAccount & { userId: number }): Promise<Account>;
  updateAccount(id: number, updates: Partial<Account>): Promise<Account>;
  
  // Transaction management
  getRecentTransactions(userId: number, limit: number): Promise<Transaction[]>;
  createTransaction(insertTransaction: InsertTransaction & { userId: number }): Promise<Transaction>;
  
  // Balance history
  getBalanceHistory(userId: number): Promise<BalanceHistory[]>;
  createBalanceHistory(userId: number, totalBalance: string): Promise<BalanceHistory>;
  
  // Audit logging
  createAuditLog(auditLog: Omit<UserAuditLog, 'id' | 'createdAt'>): Promise<UserAuditLog>;
  
  // Chat and AI assistant methods
  getChatMessages(userId: number, limit?: number): Promise<ChatMessage[]>;
  createChatMessage(chatMessage: Omit<InsertChatMessage, 'id' | 'createdAt'> & { userId: number }): Promise<ChatMessage>;
  getAIAssistantContext(userId: number, contextType?: string): Promise<AIAssistantContext[]>;
  createAIAssistantContext(context: Omit<InsertAIAssistantContext, 'id' | 'createdAt' | 'updatedAt'> & { userId: number }): Promise<AIAssistantContext>;
  updateAIAssistantContext(id: number, updates: Partial<AIAssistantContext>): Promise<AIAssistantContext>;

  // Community Insights methods
  getInsights(limit?: number, category?: string): Promise<Insight[]>;
  getInsightById(id: number): Promise<Insight | undefined>;
  createInsight(insight: InsertInsight & { authorId: number }): Promise<Insight>;
  updateInsight(id: number, updates: Partial<Insight>): Promise<Insight>;
  deleteInsight(id: number): Promise<void>;
  
  // Admin Article Management methods
  getInsightArticles(): Promise<Insight[]>;
  createInsightArticle(article: Omit<InsertInsight, 'id' | 'createdAt' | 'updatedAt'>): Promise<Insight>;
  updateInsightArticle(id: number, updates: Partial<Insight>): Promise<Insight>;
  deleteInsightArticle(id: number): Promise<void>;

  // Mentor methods
  getMentors(specialty?: string, isActive?: boolean): Promise<Mentor[]>;
  getAllMentors(): Promise<Mentor[]>;
  getMentorById(id: number): Promise<Mentor | undefined>;
  getMentorByUserId(userId: number): Promise<Mentor | undefined>;
  createMentor(mentor: InsertMentor & { userId: number }): Promise<Mentor>;
  updateMentor(id: number, updates: Partial<Mentor>): Promise<Mentor>;
  deleteMentor(id: number): Promise<void>;

  // Community Events methods
  getEvents(limit?: number, category?: string): Promise<CommunityEvent[]>;
  getEventById(id: number): Promise<CommunityEvent | undefined>;
  createEvent(event: InsertCommunityEvent & { organizerId: number }): Promise<CommunityEvent>;
  updateEvent(id: number, updates: Partial<CommunityEvent>): Promise<CommunityEvent>;
  deleteEvent(id: number): Promise<void>;
  
  // Admin Community Events Management methods
  getCommunityEvents(): Promise<CommunityEvent[]>;
  createCommunityEvent(event: Omit<InsertCommunityEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommunityEvent>;
  updateCommunityEvent(id: number, updates: Partial<CommunityEvent>): Promise<CommunityEvent>;
  deleteCommunityEvent(id: number): Promise<void>;

  // Event Registrations methods
  getEventRegistrations(eventId: number): Promise<EventRegistration[]>;
  getUserEventRegistrations(userId: number): Promise<EventRegistration[]>;
  createEventRegistration(registration: InsertEventRegistration & { eventId: number; userId: number }): Promise<EventRegistration>;
  updateEventRegistration(id: number, updates: Partial<EventRegistration>): Promise<EventRegistration>;

  // Mentor Sessions methods
  getMentorSessions(mentorId?: number, menteeId?: number): Promise<MentorSession[]>;
  createMentorSession(session: InsertMentorSession & { mentorId: number; menteeId: number }): Promise<MentorSession>;
  updateMentorSession(id: number, updates: Partial<MentorSession>): Promise<MentorSession>;

  // Loan Partners methods
  getLoanPartners(): Promise<LoanPartner[]>;
  getLoanPartner(id: number): Promise<LoanPartner | undefined>;
  createLoanPartner(partner: InsertLoanPartner): Promise<LoanPartner>;
  updateLoanPartner(id: number, updates: Partial<LoanPartner>): Promise<LoanPartner>;

  // Loan Pre-Qualifications methods
  getLoanPreQualifications(userId?: number): Promise<LoanPreQualification[]>;
  getLoanPreQualification(id: number): Promise<LoanPreQualification | undefined>;
  createLoanPreQualification(preQual: InsertLoanPreQualification & { userId: number }): Promise<LoanPreQualification>;
  updateLoanPreQualification(id: number, updates: Partial<LoanPreQualification>): Promise<LoanPreQualification>;

  // Loan Referrals methods
  getLoanReferrals(preQualificationId?: number, userId?: number): Promise<LoanReferral[]>;
  getLoanReferral(id: number): Promise<LoanReferral | undefined>;
  getLoanReferralByCode(referralCode: string): Promise<LoanReferral | undefined>;
  createLoanReferral(referral: InsertLoanReferral & { preQualificationId: number; partnerId: number }): Promise<LoanReferral>;
  updateLoanReferral(id: number, updates: Partial<LoanReferral>): Promise<LoanReferral>;

  // Job & Housing Discovery methods
  getJobListings(filters: {
    search?: string;
    location?: string;
    jobType?: string;
    experience?: string;
    industry?: string;
    remote?: boolean;
    page?: number;
    limit?: number;
  }): Promise<JobListing[]>;
  getJobListingById(id: number): Promise<JobListing | undefined>;
  createJobListing(job: InsertJobListing): Promise<JobListing>;
  updateJobListing(id: number, updates: Partial<JobListing>): Promise<JobListing>;
  deleteJobListing(id: number): Promise<void>;
  
  // Admin methods for loan partner management
  getLoanPartnerById(id: number): Promise<LoanPartner | undefined>;
  getLoanApplications(): Promise<LoanReferral[]>;
  getLoanApplicationsByUserId(userId: number): Promise<LoanReferral[]>;
  
  // Admin user management
  getAllUsers(limit?: number, offset?: number): Promise<User[]>;
  getUsersCount(): Promise<number>;
  searchUsers(query: string): Promise<User[]>;


  // Admin-specific methods
  getAllUsers(limit?: number, offset?: number, searchQuery?: string): Promise<User[]>;
  getUsersCount(searchQuery?: string): Promise<number>;
  getAllTransactions(limit?: number, offset?: number): Promise<Transaction[]>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getTransactionsCount(): Promise<number>;
  getAuditLogs(limit?: number, offset?: number): Promise<UserAuditLog[]>;
  
  // Admin user management
  adminUpdateUser(id: number, updates: Partial<User>, adminId: number): Promise<User>;
  adminDeleteUser(id: number, adminId: number): Promise<void>;
  restrictUser(userId: number, restriction: any, adminId: number): Promise<any>;
  removeUserRestriction(userId: number, adminId: number): Promise<void>;
  getUserRestrictions(userId: number): Promise<any[]>;
  
  // Admin logging
  createAdminActionLog(log: any): Promise<any>;
  getAdminActionLogs(limit?: number, offset?: number): Promise<any[]>;
  
  // System metrics
  getSystemMetrics(period?: string): Promise<any[]>;
  recordSystemMetric(metric: string, value: string, period: string): Promise<any>;
  
  // Dashboard analytics for admin
  getAdminDashboardStats(): Promise<{
    totalUsers: number;
    totalTransactions: number;
    totalAccounts: number;
    monthlyActiveUsers: number;
    recentSignups: number;
    avgTransactionsPerUser: number;
    totalBalance: string;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.passwordResetToken, token),
        // Token should not be expired (assuming passwordResetExpires is set)
      )
    );
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Account management
  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return await db.select().from(accounts).where(eq(accounts.userId, userId));
  }

  async createAccount(insertAccount: InsertAccount & { userId: number }): Promise<Account> {
    const [account] = await db
      .insert(accounts)
      .values(insertAccount)
      .returning();
    return account;
  }

  async updateAccount(id: number, updates: Partial<Account>): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set(updates)
      .where(eq(accounts.id, id))
      .returning();
    return account;
  }

  // Transaction management
  async getRecentTransactions(userId: number, limit: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(limit);
  }

  async createTransaction(insertTransaction: InsertTransaction & { userId: number }): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  // Balance history
  async getBalanceHistory(userId: number): Promise<BalanceHistory[]> {
    return await db
      .select()
      .from(balanceHistory)
      .where(eq(balanceHistory.userId, userId))
      .orderBy(desc(balanceHistory.date));
  }

  async createBalanceHistory(userId: number, totalBalance: string): Promise<BalanceHistory> {
    const [history] = await db
      .insert(balanceHistory)
      .values({
        userId,
        totalBalance,
        date: new Date(),
      })
      .returning();
    return history;
  }

  // Audit logging
  async createAuditLog(auditLog: Omit<UserAuditLog, 'id' | 'createdAt'>): Promise<UserAuditLog> {
    const [log] = await db
      .insert(userAuditLogs)
      .values(auditLog)
      .returning();
    return log;
  }

  // Chat and AI assistant methods
  async getChatMessages(userId: number, limit: number = 50): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);
  }

  async createChatMessage(chatMessage: Omit<InsertChatMessage, 'id' | 'createdAt'> & { userId: number }): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(chatMessage)
      .returning();
    return message;
  }

  async getAIAssistantContext(userId: number, contextType?: string): Promise<AIAssistantContext[]> {
    const conditions = [eq(aiAssistantContext.userId, userId), eq(aiAssistantContext.isActive, true)];
    if (contextType) {
      conditions.push(eq(aiAssistantContext.contextType, contextType));
    }
    
    return await db
      .select()
      .from(aiAssistantContext)
      .where(and(...conditions))
      .orderBy(desc(aiAssistantContext.priority), desc(aiAssistantContext.createdAt));
  }

  async createAIAssistantContext(context: Omit<InsertAIAssistantContext, 'id' | 'createdAt' | 'updatedAt'> & { userId: number }): Promise<AIAssistantContext> {
    const [newContext] = await db
      .insert(aiAssistantContext)
      .values(context)
      .returning();
    return newContext;
  }

  async updateAIAssistantContext(id: number, updates: Partial<AIAssistantContext>): Promise<AIAssistantContext> {
    const [updatedContext] = await db
      .update(aiAssistantContext)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(aiAssistantContext.id, id))
      .returning();
    return updatedContext;
  }

  // Community Insights methods
  async getInsights(limit: number = 50, category?: string): Promise<Insight[]> {
    const conditions = [];
    conditions.push(eq(insights.isPublic, true));
    conditions.push(eq(insights.status, 'published'));
    
    if (category) {
      conditions.push(eq(insights.category, category));
    }

    return await db
      .select()
      .from(insights)
      .where(and(...conditions))
      .orderBy(desc(insights.createdAt))
      .limit(limit);
  }

  async getInsightById(id: number): Promise<Insight | undefined> {
    const [insight] = await db.select().from(insights).where(eq(insights.id, id));
    return insight || undefined;
  }

  async createInsight(insight: InsertInsight & { authorId: number }): Promise<Insight> {
    const [newInsight] = await db
      .insert(insights)
      .values(insight)
      .returning();
    return newInsight;
  }

  async updateInsight(id: number, updates: Partial<Insight>): Promise<Insight> {
    const [updatedInsight] = await db
      .update(insights)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(insights.id, id))
      .returning();
    return updatedInsight;
  }

  async deleteInsight(id: number): Promise<void> {
    await db.delete(insights).where(eq(insights.id, id));
  }

  // Mentor methods
  async getMentors(specialty?: string, isActive: boolean = true): Promise<Mentor[]> {
    const conditions = [];
    conditions.push(eq(mentors.isActive, isActive));
    
    if (specialty) {
      conditions.push(eq(mentors.specialty, specialty));
    }

    return await db
      .select()
      .from(mentors)
      .where(and(...conditions))
      .orderBy(desc(mentors.createdAt));
  }

  async getMentorById(id: number): Promise<Mentor | undefined> {
    const [mentor] = await db.select().from(mentors).where(eq(mentors.id, id));
    return mentor || undefined;
  }

  async getMentorByUserId(userId: number): Promise<Mentor | undefined> {
    const [mentor] = await db.select().from(mentors).where(eq(mentors.userId, userId));
    return mentor || undefined;
  }

  async createMentor(mentor: InsertMentor & { userId: number }): Promise<Mentor> {
    const [newMentor] = await db
      .insert(mentors)
      .values(mentor)
      .returning();
    return newMentor;
  }

  async updateMentor(id: number, updates: Partial<Mentor>): Promise<Mentor> {
    const [updatedMentor] = await db
      .update(mentors)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mentors.id, id))
      .returning();
    return updatedMentor;
  }

  async getAllMentors(): Promise<Mentor[]> {
    return await db.select().from(mentors).orderBy(desc(mentors.createdAt));
  }

  async deleteMentor(id: number): Promise<void> {
    await db.delete(mentors).where(eq(mentors.id, id));
  }

  // Community Events methods
  async getEvents(limit: number = 50, category?: string): Promise<CommunityEvent[]> {
    const conditions = [];
    conditions.push(eq(communityEvents.isPublic, true));
    
    if (category) {
      conditions.push(eq(communityEvents.category, category));
    }

    return await db
      .select()
      .from(communityEvents)
      .where(and(...conditions))
      .orderBy(desc(communityEvents.date))
      .limit(limit);
  }

  async getEventById(id: number): Promise<CommunityEvent | undefined> {
    const [event] = await db.select().from(communityEvents).where(eq(communityEvents.id, id));
    return event || undefined;
  }

  async createEvent(event: InsertCommunityEvent & { organizerId: number }): Promise<CommunityEvent> {
    const [newEvent] = await db
      .insert(communityEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async updateEvent(id: number, updates: Partial<CommunityEvent>): Promise<CommunityEvent> {
    const [updatedEvent] = await db
      .update(communityEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(communityEvents.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(communityEvents).where(eq(communityEvents.id, id));
  }

  // Event Registrations methods
  async getEventRegistrations(eventId: number): Promise<EventRegistration[]> {
    return await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId));
  }

  async getUserEventRegistrations(userId: number): Promise<EventRegistration[]> {
    return await db
      .select()
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userId, userId))
      .orderBy(desc(eventRegistrations.registeredAt));
  }

  async createEventRegistration(registration: InsertEventRegistration & { eventId: number; userId: number }): Promise<EventRegistration> {
    const [newRegistration] = await db
      .insert(eventRegistrations)
      .values(registration)
      .returning();
    return newRegistration;
  }

  async updateEventRegistration(id: number, updates: Partial<EventRegistration>): Promise<EventRegistration> {
    const [updatedRegistration] = await db
      .update(eventRegistrations)
      .set(updates)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return updatedRegistration;
  }

  // Mentor Sessions methods
  async getMentorSessions(mentorId?: number, menteeId?: number): Promise<MentorSession[]> {
    const conditions = [];
    
    if (mentorId) {
      conditions.push(eq(mentorSessions.mentorId, mentorId));
    }
    
    if (menteeId) {
      conditions.push(eq(mentorSessions.menteeId, menteeId));
    }

    return await db
      .select()
      .from(mentorSessions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(mentorSessions.scheduledAt));
  }

  async createMentorSession(session: InsertMentorSession & { mentorId: number; menteeId: number }): Promise<MentorSession> {
    const [newSession] = await db
      .insert(mentorSessions)
      .values(session)
      .returning();
    return newSession;
  }

  async updateMentorSession(id: number, updates: Partial<MentorSession>): Promise<MentorSession> {
    const [updatedSession] = await db
      .update(mentorSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(mentorSessions.id, id))
      .returning();
    return updatedSession;
  }

  // Loan Partners methods
  async getLoanPartners(): Promise<LoanPartner[]> {
    return await db
      .select()
      .from(loanPartners)
      .orderBy(desc(loanPartners.createdAt));
  }

  async getLoanPartner(id: number): Promise<LoanPartner | undefined> {
    const [partner] = await db
      .select()
      .from(loanPartners)
      .where(eq(loanPartners.id, id));
    return partner || undefined;
  }

  async createLoanPartner(partner: InsertLoanPartner): Promise<LoanPartner> {
    const [newPartner] = await db
      .insert(loanPartners)
      .values(partner)
      .returning();
    return newPartner;
  }

  async updateLoanPartner(id: number, updates: Partial<LoanPartner>): Promise<LoanPartner> {
    const [updatedPartner] = await db
      .update(loanPartners)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(loanPartners.id, id))
      .returning();
    return updatedPartner;
  }

  // Loan Pre-Qualifications methods
  async getLoanPreQualifications(userId?: number): Promise<LoanPreQualification[]> {
    const query = db.select().from(loanPreQualifications);
    
    if (userId) {
      return await query
        .where(eq(loanPreQualifications.userId, userId))
        .orderBy(desc(loanPreQualifications.createdAt));
    }
    
    return await query.orderBy(desc(loanPreQualifications.createdAt));
  }

  async getLoanPreQualification(id: number): Promise<LoanPreQualification | undefined> {
    const [preQual] = await db
      .select()
      .from(loanPreQualifications)
      .where(eq(loanPreQualifications.id, id));
    return preQual || undefined;
  }

  async createLoanPreQualification(preQual: InsertLoanPreQualification & { userId: number }): Promise<LoanPreQualification> {
    const [newPreQual] = await db
      .insert(loanPreQualifications)
      .values(preQual)
      .returning();
    return newPreQual;
  }

  async updateLoanPreQualification(id: number, updates: Partial<LoanPreQualification>): Promise<LoanPreQualification> {
    const [updatedPreQual] = await db
      .update(loanPreQualifications)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(loanPreQualifications.id, id))
      .returning();
    return updatedPreQual;
  }

  // Loan Referrals methods
  async getLoanReferrals(preQualificationId?: number, userId?: number): Promise<LoanReferral[]> {
    let query = db.select().from(loanReferrals);
    
    if (preQualificationId) {
      query = query.where(eq(loanReferrals.preQualificationId, preQualificationId));
    } else if (userId) {
      // Join with pre-qualifications to filter by user
      query = db
        .select()
        .from(loanReferrals)
        .innerJoin(loanPreQualifications, eq(loanReferrals.preQualificationId, loanPreQualifications.id))
        .where(eq(loanPreQualifications.userId, userId)) as any;
    }
    
    return await query.orderBy(desc(loanReferrals.referredAt));
  }

  async getLoanReferral(id: number): Promise<LoanReferral | undefined> {
    const [referral] = await db
      .select()
      .from(loanReferrals)
      .where(eq(loanReferrals.id, id));
    return referral || undefined;
  }

  async getLoanReferralByCode(referralCode: string): Promise<LoanReferral | undefined> {
    const [referral] = await db
      .select()
      .from(loanReferrals)
      .where(eq(loanReferrals.referralCode, referralCode));
    return referral || undefined;
  }

  async createLoanReferral(referral: InsertLoanReferral & { preQualificationId: number; partnerId: number }): Promise<LoanReferral> {
    const [newReferral] = await db
      .insert(loanReferrals)
      .values(referral)
      .returning();
    return newReferral;
  }

  async updateLoanReferral(id: number, updates: Partial<LoanReferral>): Promise<LoanReferral> {
    const [updatedReferral] = await db
      .update(loanReferrals)
      .set({ ...updates, lastStatusUpdate: new Date() })
      .where(eq(loanReferrals.id, id))
      .returning();
    return updatedReferral;
  }

  // ===== FINANCIAL GOALS METHODS =====

  async getFinancialGoals(userId?: number): Promise<FinancialGoal[]> {
    const query = db.select().from(financialGoals);
    if (userId) {
      return query.where(eq(financialGoals.userId, userId));
    }
    return query;
  }

  async getFinancialGoal(id: number): Promise<FinancialGoal | undefined> {
    const [goal] = await db
      .select()
      .from(financialGoals)
      .where(eq(financialGoals.id, id));
    return goal;
  }

  async createFinancialGoal(goal: InsertFinancialGoal & { userId: number }): Promise<FinancialGoal> {
    const [newGoal] = await db
      .insert(financialGoals)
      .values(goal)
      .returning();
    return newGoal;
  }

  async updateFinancialGoal(id: number, updates: Partial<FinancialGoal>): Promise<FinancialGoal> {
    const [updatedGoal] = await db
      .update(financialGoals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(financialGoals.id, id))
      .returning();
    return updatedGoal;
  }

  async deleteFinancialGoal(id: number): Promise<void> {
    await db
      .delete(financialGoals)
      .where(eq(financialGoals.id, id));
  }

  async getGoalProgress(goalId: number): Promise<GoalProgress[]> {
    return db
      .select()
      .from(goalProgress)
      .where(eq(goalProgress.goalId, goalId))
      .orderBy(desc(goalProgress.recordedAt));
  }

  async addGoalProgress(progress: InsertGoalProgress & { goalId: number }): Promise<GoalProgress> {
    const [newProgress] = await db
      .insert(goalProgress)
      .values(progress)
      .returning();
    return newProgress;
  }

  // ===== JOB & HOUSING DISCOVERY METHODS =====

  // Job Listings methods
  async searchJobs(query: SearchJobsQuery): Promise<JobListing[]> {
    const conditions = [eq(jobListings.isActive, true)];
    
    if (query.keywords) {
      conditions.push(
        or(
          ilike(jobListings.title, `%${query.keywords}%`),
          ilike(jobListings.company, `%${query.keywords}%`),
          ilike(jobListings.description, `%${query.keywords}%`)
        )
      );
    }
    
    if (query.location) {
      conditions.push(ilike(jobListings.location, `%${query.location}%`));
    }
    
    if (query.country) {
      conditions.push(eq(jobListings.country, query.country));
    }
    
    if (query.city) {
      conditions.push(eq(jobListings.city, query.city));
    }
    
    if (query.jobType) {
      conditions.push(eq(jobListings.jobType, query.jobType));
    }
    
    if (query.remote !== undefined) {
      conditions.push(eq(jobListings.remote, query.remote));
    }
    
    if (query.experience) {
      conditions.push(eq(jobListings.experience, query.experience));
    }
    
    if (query.industry) {
      conditions.push(eq(jobListings.industry, query.industry));
    }
    
    if (query.salaryMin) {
      conditions.push(gte(jobListings.salaryMin, query.salaryMin));
    }
    
    if (query.salaryMax) {
      conditions.push(lte(jobListings.salaryMax, query.salaryMax));
    }
    
    return await db
      .select()
      .from(jobListings)
      .where(and(...conditions))
      .orderBy(desc(jobListings.postedDate))
      .limit(query.limit || 20)
      .offset(query.offset || 0);
  }

  async getJobListingById(id: number): Promise<JobListing | undefined> {
    const [job] = await db.select().from(jobListings).where(eq(jobListings.id, id));
    return job || undefined;
  }

  async getJobListings(filters: {
    search?: string;
    location?: string;
    jobType?: string;
    experience?: string;
    industry?: string;
    remote?: boolean;
    page?: number;
    limit?: number;
  }): Promise<JobListing[]> {
    const conditions = [eq(jobListings.isActive, true)];
    
    if (filters.search) {
      conditions.push(
        or(
          ilike(jobListings.title, `%${filters.search}%`),
          ilike(jobListings.company, `%${filters.search}%`),
          ilike(jobListings.description, `%${filters.search}%`)
        )!
      );
    }
    
    if (filters.location) {
      conditions.push(
        or(
          ilike(jobListings.location, `%${filters.location}%`),
          ilike(jobListings.city, `%${filters.location}%`),
          ilike(jobListings.country, `%${filters.location}%`)
        )!
      );
    }
    
    if (filters.jobType) {
      conditions.push(eq(jobListings.jobType, filters.jobType));
    }
    
    if (filters.experience) {
      conditions.push(eq(jobListings.experience, filters.experience));
    }
    
    if (filters.industry) {
      conditions.push(eq(jobListings.industry, filters.industry));
    }
    
    if (filters.remote !== undefined) {
      conditions.push(eq(jobListings.remote, filters.remote));
    }
    
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    return await db
      .select()
      .from(jobListings)
      .where(and(...conditions))
      .orderBy(desc(jobListings.postedDate))
      .limit(limit)
      .offset(offset);
  }

  async createJobListing(job: InsertJobListing): Promise<JobListing> {
    const [newJob] = await db.insert(jobListings).values(job).returning();
    return newJob;
  }

  async updateJobListing(id: number, updates: Partial<JobListing>): Promise<JobListing> {
    const [updatedJob] = await db
      .update(jobListings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobListings.id, id))
      .returning();
    return updatedJob;
  }

  async deleteJobListing(id: number): Promise<void> {
    await db.delete(jobListings).where(eq(jobListings.id, id));
  }

  // Admin methods for loan partner management
  async getLoanPartnerById(id: number): Promise<LoanPartner | undefined> {
    const [partner] = await db.select().from(loanPartners).where(eq(loanPartners.id, id));
    return partner || undefined;
  }

  async getLoanApplications(): Promise<LoanReferral[]> {
    return await db.select().from(loanReferrals).orderBy(desc(loanReferrals.createdAt));
  }

  async getLoanApplicationsByUserId(userId: number): Promise<LoanReferral[]> {
    return await db.select().from(loanReferrals).where(eq(loanReferrals.userId, userId));
  }

  async searchUsers(query: string): Promise<User[]> {
    return await db.select().from(users).where(
      or(
        ilike(users.email, `%${query}%`),
        ilike(users.firstName, `%${query}%`),
        ilike(users.lastName, `%${query}%`),
        ilike(users.username, `%${query}%`)
      )
    );
  }

  // Admin-specific methods implementation
  async getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async searchUsers(query: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(
        or(
          ilike(users.email, `%${query}%`),
          ilike(users.username, `%${query}%`),
          ilike(users.firstName, `%${query}%`),
          ilike(users.lastName, `%${query}%`)
        )
      )
      .orderBy(desc(users.createdAt))
      .limit(20);
  }

  async getAllTransactions(limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.date))
      .limit(limit)
      .offset(offset);
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async getUsersCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    return result[0]?.count || 0;
  }

  async getTransactionsCount(): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(transactions);
    return result[0]?.count || 0;
  }

  async getAuditLogs(limit: number = 50, offset: number = 0): Promise<UserAuditLog[]> {
    return await db
      .select()
      .from(userAuditLogs)
      .orderBy(desc(userAuditLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  // Enhanced admin methods
  async getAllUsers(limit: number = 50, offset: number = 0, searchQuery?: string): Promise<User[]> {
    let query = db.select().from(users);
    
    if (searchQuery) {
      query = query.where(
        or(
          ilike(users.email, `%${searchQuery}%`),
          ilike(users.username, `%${searchQuery}%`),
          ilike(users.firstName, `%${searchQuery}%`),
          ilike(users.lastName, `%${searchQuery}%`)
        )
      );
    }
    
    return await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getUsersCount(searchQuery?: string): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` }).from(users);
    
    if (searchQuery) {
      query = query.where(
        or(
          ilike(users.email, `%${searchQuery}%`),
          ilike(users.username, `%${searchQuery}%`),
          ilike(users.firstName, `%${searchQuery}%`),
          ilike(users.lastName, `%${searchQuery}%`)
        )
      );
    }
    
    const result = await query;
    return result[0]?.count || 0;
  }

  async adminUpdateUser(id: number, updates: Partial<User>, adminId: number): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    // Log admin action
    await this.createAdminActionLog({
      adminId,
      action: "user_update",
      targetUserId: id,
      details: { updates }
    });

    return updatedUser;
  }

  async adminDeleteUser(id: number, adminId: number): Promise<void> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error("User not found");
    }

    // Don't allow deletion of other admins
    if (user.role === 'admin' && user.id !== adminId) {
      throw new Error("Cannot delete other admin users");
    }

    await db.delete(users).where(eq(users.id, id));

    // Log admin action
    await this.createAdminActionLog({
      adminId,
      action: "user_delete",
      targetUserId: id,
      details: { deletedUser: { email: user.email, role: user.role } }
    });
  }

  async restrictUser(userId: number, restriction: any, adminId: number): Promise<any> {
    // Implementation will depend on actual schema, using placeholder for now
    const log = await this.createAdminActionLog({
      adminId,
      action: "user_restrict",
      targetUserId: userId,
      details: { restriction }
    });

    return log;
  }

  async removeUserRestriction(userId: number, adminId: number): Promise<void> {
    await this.createAdminActionLog({
      adminId,
      action: "user_unrestrict",
      targetUserId: userId,
      details: {}
    });
  }

  async getUserRestrictions(userId: number): Promise<any[]> {
    // Placeholder - would implement with actual userRestrictions table
    return [];
  }

  async createAdminActionLog(log: any): Promise<any> {
    // Using audit logs table for now, would use adminActionLogs in production
    return await this.createAuditLog({
      userId: log.adminId,
      action: log.action,
      details: JSON.stringify({
        targetUserId: log.targetUserId,
        ...log.details
      }),
      ipAddress: null,
      userAgent: null
    });
  }

  async getAdminActionLogs(limit: number = 50, offset: number = 0): Promise<any[]> {
    return await this.getAuditLogs(limit, offset);
  }

  async getSystemMetrics(period?: string): Promise<any[]> {
    // Placeholder - would implement with actual systemMetrics table
    return [];
  }

  async recordSystemMetric(metric: string, value: string, period: string): Promise<any> {
    // Placeholder - would implement with actual systemMetrics table
    return {};
  }

  async getAdminDashboardStats(): Promise<{
    totalUsers: number;
    totalTransactions: number;
    totalAccounts: number;
    monthlyActiveUsers: number;
    recentSignups: number;
    avgTransactionsPerUser: number;
    totalBalance: string;
  }> {
    const [
      totalUsersResult,
      totalTransactionsResult,
      totalAccountsResult,
      totalBalanceResult,
      recentSignupsResult
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(transactions),
      db.select({ count: sql<number>`count(*)` }).from(accounts),
      db.select({ total: sql<string>`sum(balance)` }).from(accounts),
      db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
    ]);

    const totalUsers = totalUsersResult[0]?.count || 0;
    const totalTransactions = totalTransactionsResult[0]?.count || 0;
    const totalAccounts = totalAccountsResult[0]?.count || 0;
    const totalBalance = totalBalanceResult[0]?.total || "0";
    const recentSignups = recentSignupsResult[0]?.count || 0;

    // Calculate monthly active users (users with transactions in last 30 days)
    const monthlyActiveResult = await db
      .select({ count: sql<number>`count(distinct user_id)` })
      .from(transactions)
      .where(gte(transactions.date, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
    
    const monthlyActiveUsers = monthlyActiveResult[0]?.count || 0;
    const avgTransactionsPerUser = totalUsers > 0 ? Math.round(totalTransactions / totalUsers * 100) / 100 : 0;

    return {
      totalUsers,
      totalTransactions,
      totalAccounts,
      monthlyActiveUsers,
      recentSignups,
      avgTransactionsPerUser,
      totalBalance
    };
  }

  // Admin Article Management methods
  async getInsightArticles(): Promise<Insight[]> {
    return await db.select().from(insights).orderBy(desc(insights.createdAt));
  }

  async createInsightArticle(article: Omit<InsertInsight, 'id' | 'createdAt' | 'updatedAt'>): Promise<Insight> {
    const [created] = await db.insert(insights).values(article).returning();
    return created;
  }

  async updateInsightArticle(id: number, updates: Partial<Insight>): Promise<Insight> {
    const [updated] = await db
      .update(insights)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(insights.id, id))
      .returning();
    return updated;
  }

  async deleteInsightArticle(id: number): Promise<void> {
    await db.delete(insights).where(eq(insights.id, id));
  }

  // Admin Community Events Management methods
  async getCommunityEvents(): Promise<CommunityEvent[]> {
    return await db.select().from(communityEvents).orderBy(desc(communityEvents.createdAt));
  }

  async createCommunityEvent(event: Omit<InsertCommunityEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommunityEvent> {
    const [created] = await db.insert(communityEvents).values(event).returning();
    return created;
  }

  async updateCommunityEvent(id: number, updates: Partial<CommunityEvent>): Promise<CommunityEvent> {
    const [updated] = await db
      .update(communityEvents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(communityEvents.id, id))
      .returning();
    return updated;
  }

  async deleteCommunityEvent(id: number): Promise<void> {
    await db.delete(communityEvents).where(eq(communityEvents.id, id));
  }
}

export const storage = new DatabaseStorage();