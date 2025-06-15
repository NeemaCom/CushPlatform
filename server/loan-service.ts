import { db } from "./db";
import { loanPartners, loanPreQualifications, loanReferrals } from "../shared/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
import type { LoanPartner, LoanPreQualification, InsertLoanReferral } from "../shared/schema";
import { nanoid } from "nanoid";

export interface EligibilityCriteria {
  countries?: string[];
  minCreditScore?: number;
  maxCreditScore?: number;
  minIncome?: number;
  maxIncome?: number;
  minAmount?: number;
  maxAmount?: number;
  employmentStatus?: string[];
  loanPurposes?: string[];
  maxDebtToIncomeRatio?: number;
}

export interface MatchResult {
  partner: LoanPartner;
  matchScore: number;
  eligibilityMet: boolean;
  matchReasons: string[];
}

export class LoanService {
  
  /**
   * Find matching loan partners for a pre-qualification
   */
  async findMatchingPartners(preQualification: LoanPreQualification): Promise<MatchResult[]> {
    // Get all active partners
    const activePartners = await db
      .select()
      .from(loanPartners)
      .where(eq(loanPartners.isActive, true));

    const matches: MatchResult[] = [];

    for (const partner of activePartners) {
      const matchResult = this.evaluatePartnerMatch(partner, preQualification);
      if (matchResult.matchScore > 0) {
        matches.push(matchResult);
      }
    }

    // Sort by match score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Evaluate how well a partner matches a pre-qualification
   */
  private evaluatePartnerMatch(partner: LoanPartner, preQual: LoanPreQualification): MatchResult {
    const criteria = partner.eligibilityCriteria as EligibilityCriteria || {};
    let matchScore = 0;
    let eligibilityMet = true;
    const matchReasons: string[] = [];

    // Check country eligibility
    if (criteria.countries && preQual.country) {
      if (criteria.countries.includes(preQual.country)) {
        matchScore += 20;
        matchReasons.push("Country supported");
      } else {
        eligibilityMet = false;
        matchReasons.push("Country not supported");
      }
    }

    // Check loan amount range
    const requestedAmount = parseFloat(preQual.amountRequested.toString());
    
    if (partner.minLoanAmount && requestedAmount < parseFloat(partner.minLoanAmount.toString())) {
      eligibilityMet = false;
      matchReasons.push(`Amount below minimum (${partner.minLoanAmount})`);
    } else if (partner.minLoanAmount) {
      matchScore += 15;
      matchReasons.push("Amount above minimum");
    }

    if (partner.maxLoanAmount && requestedAmount > parseFloat(partner.maxLoanAmount.toString())) {
      eligibilityMet = false;
      matchReasons.push(`Amount above maximum (${partner.maxLoanAmount})`);
    } else if (partner.maxLoanAmount) {
      matchScore += 15;
      matchReasons.push("Amount below maximum");
    }

    // Check credit score if available
    if (criteria.minCreditScore && preQual.creditScore) {
      if (preQual.creditScore >= criteria.minCreditScore) {
        matchScore += 25;
        matchReasons.push("Credit score meets minimum");
      } else {
        eligibilityMet = false;
        matchReasons.push(`Credit score below minimum (${criteria.minCreditScore})`);
      }
    }

    if (criteria.maxCreditScore && preQual.creditScore) {
      if (preQual.creditScore <= criteria.maxCreditScore) {
        matchScore += 10;
        matchReasons.push("Credit score within range");
      } else {
        eligibilityMet = false;
        matchReasons.push(`Credit score above maximum (${criteria.maxCreditScore})`);
      }
    }

    // Check employment status
    if (criteria.employmentStatus && criteria.employmentStatus.length > 0) {
      if (criteria.employmentStatus.includes(preQual.employmentStatus)) {
        matchScore += 20;
        matchReasons.push("Employment status accepted");
      } else {
        eligibilityMet = false;
        matchReasons.push("Employment status not accepted");
      }
    }

    // Check loan purpose
    if (criteria.loanPurposes && criteria.loanPurposes.length > 0) {
      if (criteria.loanPurposes.includes(preQual.loanPurpose)) {
        matchScore += 15;
        matchReasons.push("Loan purpose supported");
      } else {
        eligibilityMet = false;
        matchReasons.push("Loan purpose not supported");
      }
    }

    // Check income requirements
    if (criteria.minIncome && preQual.monthlyIncome) {
      const monthlyIncome = parseFloat(preQual.monthlyIncome.toString());
      if (monthlyIncome >= criteria.minIncome) {
        matchScore += 20;
        matchReasons.push("Income meets minimum");
      } else {
        eligibilityMet = false;
        matchReasons.push(`Income below minimum (${criteria.minIncome})`);
      }
    }

    // Check debt-to-income ratio
    if (criteria.maxDebtToIncomeRatio && preQual.monthlyIncome && preQual.existingDebt) {
      const monthlyIncome = parseFloat(preQual.monthlyIncome.toString());
      const existingDebt = parseFloat(preQual.existingDebt.toString());
      const debtToIncomeRatio = existingDebt / monthlyIncome;
      
      if (debtToIncomeRatio <= criteria.maxDebtToIncomeRatio) {
        matchScore += 15;
        matchReasons.push("Debt-to-income ratio acceptable");
      } else {
        eligibilityMet = false;
        matchReasons.push(`Debt-to-income ratio too high (${(debtToIncomeRatio * 100).toFixed(1)}%)`);
      }
    }

    // Currency support check
    if (partner.supportedCurrencies && !partner.supportedCurrencies.includes(preQual.currency || "USD")) {
      eligibilityMet = false;
      matchReasons.push("Currency not supported");
    } else {
      matchScore += 5;
      matchReasons.push("Currency supported");
    }

    return {
      partner,
      matchScore: eligibilityMet ? matchScore : 0,
      eligibilityMet,
      matchReasons
    };
  }

  /**
   * Create referrals for matched partners
   */
  async createReferrals(preQualificationId: number, matchedPartners: MatchResult[]): Promise<void> {
    const referrals = matchedPartners.map(match => ({
      preQualificationId,
      partnerId: match.partner.id,
      referralLink: this.generateReferralLink(preQualificationId, match.partner.id),
      referralCode: this.generateReferralCode(),
      referralStatus: "referred" as const,
      notes: `Match score: ${match.matchScore}. Reasons: ${match.matchReasons.join(", ")}`,
    }));

    if (referrals.length > 0) {
      await db.insert(loanReferrals).values(referrals);
    }
  }

  /**
   * Generate a unique trackable referral link
   */
  private generateReferralLink(preQualId: number, partnerId: number): string {
    const trackingId = nanoid(12);
    return `${process.env.BASE_URL || 'http://localhost:5000'}/api/loans/referral/${trackingId}?pq=${preQualId}&p=${partnerId}`;
  }

  /**
   * Generate a short referral code
   */
  private generateReferralCode(): string {
    return nanoid(8).toUpperCase();
  }

  /**
   * Process a pre-qualification and create referrals
   */
  async processPreQualification(preQualificationId: number): Promise<{
    matches: MatchResult[];
    referralsCreated: number;
  }> {
    // Get the pre-qualification
    const preQual = await db
      .select()
      .from(loanPreQualifications)
      .where(eq(loanPreQualifications.id, preQualificationId))
      .limit(1);

    if (!preQual[0]) {
      throw new Error("Pre-qualification not found");
    }

    // Update status to processing
    await db
      .update(loanPreQualifications)
      .set({ 
        status: "processing",
        updatedAt: new Date()
      })
      .where(eq(loanPreQualifications.id, preQualificationId));

    try {
      // Find matching partners
      const matches = await this.findMatchingPartners(preQual[0]);
      
      if (matches.length === 0) {
        // No matches found
        await db
          .update(loanPreQualifications)
          .set({ 
            status: "no_match",
            updatedAt: new Date()
          })
          .where(eq(loanPreQualifications.id, preQualificationId));
        
        return { matches: [], referralsCreated: 0 };
      }

      // Create referrals for eligible partners
      const eligibleMatches = matches.filter(m => m.eligibilityMet);
      await this.createReferrals(preQualificationId, eligibleMatches);

      // Update status to matched
      await db
        .update(loanPreQualifications)
        .set({ 
          status: "matched",
          updatedAt: new Date()
        })
        .where(eq(loanPreQualifications.id, preQualificationId));

      return { 
        matches, 
        referralsCreated: eligibleMatches.length 
      };

    } catch (error) {
      // Update status back to submitted on error
      await db
        .update(loanPreQualifications)
        .set({ 
          status: "submitted",
          updatedAt: new Date()
        })
        .where(eq(loanPreQualifications.id, preQualificationId));
      
      throw error;
    }
  }

  /**
   * Track referral click and redirect to partner
   */
  async trackReferralClick(trackingId: string, preQualId: number, partnerId: number): Promise<string | null> {
    try {
      // Find the referral
      const referral = await db
        .select()
        .from(loanReferrals)
        .where(
          and(
            eq(loanReferrals.preQualificationId, preQualId),
            eq(loanReferrals.partnerId, partnerId)
          )
        )
        .limit(1);

      if (!referral[0]) {
        return null;
      }

      // Get partner details
      const partner = await db
        .select()
        .from(loanPartners)
        .where(eq(loanPartners.id, partnerId))
        .limit(1);

      if (!partner[0] || !partner[0].website) {
        return null;
      }

      // Update referral status if it's still "referred"
      if (referral[0].referralStatus === "referred") {
        await db
          .update(loanReferrals)
          .set({ 
            referralStatus: "applied",
            appliedAt: new Date(),
            lastStatusUpdate: new Date()
          })
          .where(eq(loanReferrals.id, referral[0].id));
      }

      return partner[0].website;

    } catch (error) {
      console.error("Error tracking referral click:", error);
      return null;
    }
  }

  /**
   * Update referral status from partner webhook
   */
  async updateReferralStatus(
    referralCode: string, 
    status: string, 
    partnerData: any
  ): Promise<boolean> {
    try {
      const referral = await db
        .select()
        .from(loanReferrals)
        .where(eq(loanReferrals.referralCode, referralCode))
        .limit(1);

      if (!referral[0]) {
        return false;
      }

      const updateData: any = {
        referralStatus: status,
        partnerResponse: partnerData,
        lastStatusUpdate: new Date()
      };

      // Set specific timestamps based on status
      switch (status) {
        case "applied":
          updateData.appliedAt = new Date();
          break;
        case "approved":
          updateData.approvedAt = new Date();
          if (partnerData.approvedAmount) {
            updateData.approvedAmount = partnerData.approvedAmount;
          }
          if (partnerData.approvedRate) {
            updateData.approvedRate = partnerData.approvedRate;
          }
          break;
        case "rejected":
          updateData.rejectedAt = new Date();
          break;
      }

      // Calculate commission if approved
      if (status === "approved" && partnerData.approvedAmount) {
        const partner = await db
          .select()
          .from(loanPartners)
          .where(eq(loanPartners.id, referral[0].partnerId))
          .limit(1);

        if (partner[0]?.referralCommissionRate) {
          const commissionRate = parseFloat(partner[0].referralCommissionRate.toString());
          const approvedAmount = parseFloat(partnerData.approvedAmount);
          updateData.commissionEarned = (approvedAmount * commissionRate).toFixed(2);
        }
      }

      await db
        .update(loanReferrals)
        .set(updateData)
        .where(eq(loanReferrals.id, referral[0].id));

      return true;

    } catch (error) {
      console.error("Error updating referral status:", error);
      return false;
    }
  }

  /**
   * Get loan referral revenue metrics for admin
   */
  async getLoanReferralRevenue(startDate?: Date, endDate?: Date) {
    try {
      // Build the base query with raw SQL for aggregations
      const query = `
        SELECT 
          lr.partner_id,
          lp.name as partner_name,
          COUNT(*) as total_referrals,
          COUNT(CASE WHEN lr.referral_status = 'approved' THEN 1 END) as approved_referrals,
          COALESCE(SUM(lr.commission_earned), 0) as total_commission_earned,
          COALESCE(SUM(CASE WHEN lr.commission_paid = true THEN lr.commission_earned ELSE 0 END), 0) as total_commission_paid,
          COALESCE(AVG(lr.approved_amount), 0) as average_approved_amount
        FROM loan_referrals lr
        LEFT JOIN loan_partners lp ON lr.partner_id = lp.id
        WHERE 1=1
        ${startDate ? `AND lr.referred_at >= '${startDate.toISOString()}'` : ''}
        ${endDate ? `AND lr.referred_at <= '${endDate.toISOString()}'` : ''}
        GROUP BY lr.partner_id, lp.name
        ORDER BY total_commission_earned DESC
      `;

      const result = await db.execute(query);
      return result.rows;

    } catch (error) {
      console.error("Error getting loan referral revenue:", error);
      throw error;
    }
  }
}

export const loanService = new LoanService();