import { db } from './db';
import { 
  loanProviders, 
  loanApplications, 
  loanPrequalifications, 
  loanReviews, 
  loanFavorites, 
  loanApplicationDrafts, 
  loanProviderReviews 
} from '@shared/schema';
import { eq, and, or, gte, lte, sql, desc } from 'drizzle-orm';
import type { 
  LoanProvider, 
  LoanPrequalification, 
  LoanApplication, 
  InsertLoanPrequalification,
  InsertLoanApplication,
  LoanFavorite,
  InsertLoanFavorite,
  LoanApplicationDraft,
  InsertLoanApplicationDraft,
  LoanProviderReview,
  InsertLoanProviderReview
} from '@shared/schema';

export class LoanService {
  // Get all loan providers with filters
  async getLoanProviders(country?: string, type?: string): Promise<LoanProvider[]> {
    let query = db.select().from(loanProviders).where(eq(loanProviders.isActive, true));
    
    if (country) {
      query = query.where(eq(loanProviders.country, country));
    }
    
    if (type) {
      query = query.where(eq(loanProviders.type, type));
    }
    
    return await query.orderBy(loanProviders.rating);
  }

  // Calculate prequalification score
  calculatePrequalificationScore(data: InsertLoanPrequalification): number {
    let score = 0;
    
    // Income score (0-30 points)
    const monthlyIncome = Number(data.monthlyIncome);
    if (monthlyIncome >= 5000) score += 30;
    else if (monthlyIncome >= 3000) score += 25;
    else if (monthlyIncome >= 2000) score += 20;
    else if (monthlyIncome >= 1000) score += 15;
    else score += 5;
    
    // Employment score (0-20 points)
    if (data.employmentStatus === 'employed') {
      score += 20;
      if (data.employmentType === 'full_time') score += 5;
    } else if (data.employmentStatus === 'self_employed') {
      score += 15;
    } else {
      score += 5;
    }
    
    // Credit score (0-25 points)
    if (data.creditScore) {
      if (data.creditScore >= 750) score += 25;
      else if (data.creditScore >= 650) score += 20;
      else if (data.creditScore >= 550) score += 15;
      else if (data.creditScore >= 450) score += 10;
      else score += 5;
    } else {
      score += 10; // Default for unknown credit score
    }
    
    // Debt-to-income ratio (0-15 points)
    const existingDebts = Number(data.existingDebts || 0);
    const debtToIncomeRatio = existingDebts / monthlyIncome;
    if (debtToIncomeRatio <= 0.3) score += 15;
    else if (debtToIncomeRatio <= 0.5) score += 10;
    else if (debtToIncomeRatio <= 0.7) score += 5;
    else score += 0;
    
    // Work experience (0-10 points)
    const workExperience = data.workExperience || 0;
    if (workExperience >= 24) score += 10;
    else if (workExperience >= 12) score += 7;
    else if (workExperience >= 6) score += 5;
    else score += 2;
    
    return Math.min(score, 100); // Cap at 100
  }

  // Match loan providers based on prequalification
  async matchLoanProviders(prequalData: InsertLoanPrequalification): Promise<LoanProvider[]> {
    const score = this.calculatePrequalificationScore(prequalData);
    const preferredAmount = Number(prequalData.preferredAmount);
    
    // Get providers matching criteria
    const providers = await db.select().from(loanProviders)
      .where(
        and(
          eq(loanProviders.isActive, true),
          eq(loanProviders.country, prequalData.residenceCountry || 'UK'),
          or(
            lte(loanProviders.minAmount, preferredAmount),
            sql`${loanProviders.minAmount} IS NULL`
          ),
          or(
            gte(loanProviders.maxAmount, preferredAmount),
            sql`${loanProviders.maxAmount} IS NULL`
          )
        )
      )
      .orderBy(loanProviders.rating);
    
    // Filter by score-based eligibility
    return providers.filter(provider => {
      const eligibility = provider.eligibilityCriteria as any;
      if (!eligibility) return true;
      
      // Check minimum score requirements
      if (eligibility.minScore && score < eligibility.minScore) return false;
      
      // Check income requirements
      if (eligibility.minIncome && Number(prequalData.monthlyIncome) < eligibility.minIncome) return false;
      
      // Check employment requirements
      if (eligibility.employmentTypes && !eligibility.employmentTypes.includes(prequalData.employmentType)) return false;
      
      return true;
    });
  }

  // Save prequalification data
  async savePrequalification(data: InsertLoanPrequalification): Promise<LoanPrequalification> {
    const score = this.calculatePrequalificationScore(data);
    const matchedProviders = await this.matchLoanProviders(data);
    
    const prequalData = {
      ...data,
      prequalificationScore: score,
      matchedProviders: matchedProviders.map(p => p.id),
      completedAt: new Date()
    };
    
    const [result] = await db.insert(loanPrequalifications).values(prequalData).returning();
    return result;
  }

  // Submit loan application
  async submitLoanApplication(data: InsertLoanApplication): Promise<LoanApplication> {
    const [result] = await db.insert(loanApplications).values(data).returning();
    return result;
  }

  // Get user's loan applications
  async getUserLoanApplications(userId: number): Promise<LoanApplication[]> {
    return await db.select().from(loanApplications)
      .where(eq(loanApplications.userId, userId))
      .orderBy(loanApplications.submittedAt);
  }

  // Get user's prequalifications
  async getUserPrequalifications(userId: number): Promise<LoanPrequalification[]> {
    return await db.select().from(loanPrequalifications)
      .where(eq(loanPrequalifications.userId, userId))
      .orderBy(loanPrequalifications.createdAt);
  }

  // Get loan provider by ID
  async getLoanProviderById(id: number): Promise<LoanProvider | null> {
    const [result] = await db.select().from(loanProviders)
      .where(eq(loanProviders.id, id));
    return result || null;
  }

  // Get loan provider reviews
  async getProviderReviews(providerId: number): Promise<any[]> {
    return await db.select().from(loanReviews)
      .where(eq(loanReviews.loanProviderId, providerId))
      .orderBy(loanReviews.createdAt);
  }

  // === Enhanced UX Features ===

  // Loan Favorites Management
  async addToFavorites(userId: number, loanProviderId: number): Promise<LoanFavorite> {
    const [favorite] = await db
      .insert(loanFavorites)
      .values({ userId, loanProviderId })
      .returning();
    return favorite;
  }

  async removeFromFavorites(userId: number, loanProviderId: number): Promise<void> {
    await db
      .delete(loanFavorites)
      .where(and(
        eq(loanFavorites.userId, userId),
        eq(loanFavorites.loanProviderId, loanProviderId)
      ));
  }

  async getUserFavorites(userId: number): Promise<LoanProvider[]> {
    return await db
      .select({
        id: loanProviders.id,
        name: loanProviders.name,
        country: loanProviders.country,
        type: loanProviders.type,
        description: loanProviders.description,
        website: loanProviders.website,
        logoUrl: loanProviders.logoUrl,
        minAmount: loanProviders.minAmount,
        maxAmount: loanProviders.maxAmount,
        minInterestRate: loanProviders.minInterestRate,
        maxInterestRate: loanProviders.maxInterestRate,
        minTermMonths: loanProviders.minTermMonths,
        maxTermMonths: loanProviders.maxTermMonths,
        currencies: loanProviders.currencies,
        processingTime: loanProviders.processingTime,
        features: loanProviders.features,
        rating: loanProviders.rating,
        totalReviews: loanProviders.totalReviews,
        isActive: loanProviders.isActive,
        isVerified: loanProviders.isVerified,
        createdAt: loanProviders.createdAt,
        updatedAt: loanProviders.updatedAt,
      })
      .from(loanFavorites)
      .innerJoin(loanProviders, eq(loanFavorites.loanProviderId, loanProviders.id))
      .where(eq(loanFavorites.userId, userId))
      .orderBy(desc(loanFavorites.createdAt));
  }

  async checkIsFavorite(userId: number, loanProviderId: number): Promise<boolean> {
    const [favorite] = await db
      .select()
      .from(loanFavorites)
      .where(and(
        eq(loanFavorites.userId, userId),
        eq(loanFavorites.loanProviderId, loanProviderId)
      ));
    return !!favorite;
  }

  // Draft Management for Save/Resume
  async saveDraft(userId: number, loanProviderId: number, draftData: Record<string, any>, stepCompleted: number): Promise<LoanApplicationDraft> {
    const [existingDraft] = await db
      .select()
      .from(loanApplicationDrafts)
      .where(and(
        eq(loanApplicationDrafts.userId, userId),
        eq(loanApplicationDrafts.loanProviderId, loanProviderId)
      ));

    if (existingDraft) {
      const [updatedDraft] = await db
        .update(loanApplicationDrafts)
        .set({ draftData, stepCompleted, updatedAt: new Date() })
        .where(eq(loanApplicationDrafts.id, existingDraft.id))
        .returning();
      return updatedDraft;
    } else {
      const [newDraft] = await db
        .insert(loanApplicationDrafts)
        .values({ userId, loanProviderId, draftData, stepCompleted })
        .returning();
      return newDraft;
    }
  }

  async getDraft(userId: number, loanProviderId: number): Promise<LoanApplicationDraft | null> {
    const [draft] = await db
      .select()
      .from(loanApplicationDrafts)
      .where(and(
        eq(loanApplicationDrafts.userId, userId),
        eq(loanApplicationDrafts.loanProviderId, loanProviderId)
      ));
    return draft || null;
  }

  async getUserDrafts(userId: number): Promise<LoanApplicationDraft[]> {
    return await db
      .select()
      .from(loanApplicationDrafts)
      .where(eq(loanApplicationDrafts.userId, userId))
      .orderBy(desc(loanApplicationDrafts.updatedAt));
  }

  async deleteDraft(userId: number, loanProviderId: number): Promise<void> {
    await db
      .delete(loanApplicationDrafts)
      .where(and(
        eq(loanApplicationDrafts.userId, userId),
        eq(loanApplicationDrafts.loanProviderId, loanProviderId)
      ));
  }

  // Enhanced Provider Reviews
  async addProviderReview(userId: number, review: InsertLoanProviderReview): Promise<LoanProviderReview> {
    const [newReview] = await db
      .insert(loanProviderReviews)
      .values({ ...review, userId })
      .returning();
    return newReview;
  }

  async getProviderReviewsEnhanced(providerId: number): Promise<LoanProviderReview[]> {
    return await db
      .select()
      .from(loanProviderReviews)
      .where(eq(loanProviderReviews.loanProviderId, providerId))
      .orderBy(desc(loanProviderReviews.createdAt));
  }

  async getUserReviews(userId: number): Promise<LoanProviderReview[]> {
    return await db
      .select()
      .from(loanProviderReviews)
      .where(eq(loanProviderReviews.userId, userId))
      .orderBy(desc(loanProviderReviews.createdAt));
  }

  // Get providers with favorite status for a user
  async getProvidersWithFavoriteStatus(userId: number, country?: string): Promise<(LoanProvider & { isFavorite: boolean })[]> {
    let query = db
      .select({
        id: loanProviders.id,
        name: loanProviders.name,
        country: loanProviders.country,
        type: loanProviders.type,
        description: loanProviders.description,
        website: loanProviders.website,
        logoUrl: loanProviders.logoUrl,
        minAmount: loanProviders.minAmount,
        maxAmount: loanProviders.maxAmount,
        minInterestRate: loanProviders.minInterestRate,
        maxInterestRate: loanProviders.maxInterestRate,
        minTermMonths: loanProviders.minTermMonths,
        maxTermMonths: loanProviders.maxTermMonths,
        currencies: loanProviders.currencies,
        processingTime: loanProviders.processingTime,
        features: loanProviders.features,
        rating: loanProviders.rating,
        totalReviews: loanProviders.totalReviews,
        isActive: loanProviders.isActive,
        isVerified: loanProviders.isVerified,
        createdAt: loanProviders.createdAt,
        updatedAt: loanProviders.updatedAt,
        isFavorite: sql<boolean>`CASE WHEN ${loanFavorites.id} IS NOT NULL THEN true ELSE false END`,
      })
      .from(loanProviders)
      .leftJoin(loanFavorites, and(
        eq(loanFavorites.loanProviderId, loanProviders.id),
        eq(loanFavorites.userId, userId)
      ))
      .where(eq(loanProviders.isActive, true));

    if (country) {
      query = query.where(eq(loanProviders.country, country));
    }

    return await query.orderBy(desc(loanProviders.rating));
  }
}

export const loanService = new LoanService();