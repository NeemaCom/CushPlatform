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
  housingListings,
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
  type HousingListing,
  type InsertJobListing,
  type InsertHousingListing,
  type SearchJobsQuery,
  type SearchHousingQuery,
  type UpdateHousingListing
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ilike, gte, lte } from "drizzle-orm";

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

  // Mentor methods
  getMentors(specialty?: string, isActive?: boolean): Promise<Mentor[]>;
  getMentorById(id: number): Promise<Mentor | undefined>;
  getMentorByUserId(userId: number): Promise<Mentor | undefined>;
  createMentor(mentor: InsertMentor & { userId: number }): Promise<Mentor>;
  updateMentor(id: number, updates: Partial<Mentor>): Promise<Mentor>;

  // Community Events methods
  getEvents(limit?: number, category?: string): Promise<CommunityEvent[]>;
  getEventById(id: number): Promise<CommunityEvent | undefined>;
  createEvent(event: InsertCommunityEvent & { organizerId: number }): Promise<CommunityEvent>;
  updateEvent(id: number, updates: Partial<CommunityEvent>): Promise<CommunityEvent>;
  deleteEvent(id: number): Promise<void>;

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
  searchJobs(query: SearchJobsQuery): Promise<JobListing[]>;
  getJobListing(id: number): Promise<JobListing | undefined>;
  createJobListing(job: InsertJobListing): Promise<JobListing>;
  updateJobListing(id: number, updates: Partial<JobListing>): Promise<JobListing>;
  deleteJobListing(id: number): Promise<void>;

  searchHousing(query: SearchHousingQuery): Promise<HousingListing[]>;
  getHousingListing(id: number): Promise<HousingListing | undefined>;
  getUserHousingListings(userId: number): Promise<HousingListing[]>;
  createHousingListing(housing: InsertHousingListing & { userId: number }): Promise<HousingListing>;
  updateHousingListing(id: number, updates: UpdateHousingListing): Promise<HousingListing>;
  deleteHousingListing(id: number): Promise<void>;
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
      .values([mentor])
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

  async getJobListing(id: number): Promise<JobListing | undefined> {
    const [job] = await db.select().from(jobListings).where(eq(jobListings.id, id));
    return job || undefined;
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

  // Housing Listings methods
  async searchHousing(query: SearchHousingQuery): Promise<HousingListing[]> {
    const conditions = [eq(housingListings.isActive, true)];
    
    if (query.location) {
      conditions.push(
        or(
          ilike(housingListings.address, `%${query.location}%`),
          ilike(housingListings.city, `%${query.location}%`)
        )
      );
    }
    
    if (query.country) {
      conditions.push(eq(housingListings.country, query.country));
    }
    
    if (query.city) {
      conditions.push(eq(housingListings.city, query.city));
    }
    
    if (query.propertyType) {
      conditions.push(eq(housingListings.propertyType, query.propertyType));
    }
    
    if (query.minRent) {
      conditions.push(gte(housingListings.rentAmount, query.minRent));
    }
    
    if (query.maxRent) {
      conditions.push(lte(housingListings.rentAmount, query.maxRent));
    }
    
    if (query.bedrooms !== undefined) {
      conditions.push(eq(housingListings.bedrooms, query.bedrooms));
    }
    
    if (query.bathrooms !== undefined) {
      conditions.push(gte(housingListings.bathrooms, query.bathrooms.toString()));
    }
    
    if (query.furnished !== undefined) {
      conditions.push(eq(housingListings.furnished, query.furnished));
    }
    
    if (query.petsAllowed !== undefined) {
      conditions.push(eq(housingListings.petsAllowed, query.petsAllowed));
    }
    
    if (query.utilitiesIncluded !== undefined) {
      conditions.push(eq(housingListings.utilitiesIncluded, query.utilitiesIncluded));
    }
    
    if (query.availableFrom) {
      conditions.push(gte(housingListings.availabilityDate, new Date(query.availableFrom)));
    }
    
    return await db
      .select()
      .from(housingListings)
      .where(and(...conditions))
      .orderBy(desc(housingListings.createdAt))
      .limit(query.limit || 20)
      .offset(query.offset || 0);
  }

  async getHousingListing(id: number): Promise<HousingListing | undefined> {
    const [housing] = await db.select().from(housingListings).where(eq(housingListings.id, id));
    return housing || undefined;
  }

  async getUserHousingListings(userId: number): Promise<HousingListing[]> {
    return await db
      .select()
      .from(housingListings)
      .where(eq(housingListings.userId, userId))
      .orderBy(desc(housingListings.createdAt));
  }

  async createHousingListing(housing: InsertHousingListing & { userId: number }): Promise<HousingListing> {
    const [newHousing] = await db.insert(housingListings).values(housing).returning();
    return newHousing;
  }

  async updateHousingListing(id: number, updates: UpdateHousingListing): Promise<HousingListing> {
    const [updatedHousing] = await db
      .update(housingListings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(housingListings.id, id))
      .returning();
    return updatedHousing;
  }

  async deleteHousingListing(id: number): Promise<void> {
    await db.delete(housingListings).where(eq(housingListings.id, id));
  }
}

export const storage = new DatabaseStorage();