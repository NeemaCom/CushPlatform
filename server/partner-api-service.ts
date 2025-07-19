import { db } from './db';
import { loanPartners, loanReferrals, loanPreQualifications, loanApplications, loanProviders } from '@shared/schema';
import { eq, and, desc, sql, gte, lte, or } from 'drizzle-orm';
import { generateReferralCode, generateTrackingLink } from '../utils/referral-utils';
import { SecurityLogger } from './security';
import type { InsertLoanReferral, LoanPartner, LoanPreQualification, LoanReferral } from '@shared/schema';

interface PartnerAPIResponse {
  success: boolean;
  applicationId?: string;
  status?: string;
  message?: string;
  data?: any;
}

interface CommissionCalculation {
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  currency: string;
}

interface PrequalificationMatch {
  partner: LoanPartner;
  matchScore: number;
  eligibilityReasons: string[];
}

export class PartnerAPIService {
  
  /**
   * Process prequalification and create referrals to matching partners
   */
  async processPrequalification(prequalificationId: number): Promise<{
    matches: PrequalificationMatch[];
    referralsCreated: number;
    totalCommissionPotential: number;
  }> {
    try {
      // Get prequalification details
      const [prequalification] = await db
        .select()
        .from(loanPreQualifications)
        .where(eq(loanPreQualifications.id, prequalificationId));

      if (!prequalification) {
        throw new Error('Prequalification not found');
      }

      // Find matching partners
      const matchingPartners = await this.findMatchingPartners(prequalification);
      
      // Create referrals for each matching partner
      const referrals: LoanReferral[] = [];
      let totalCommissionPotential = 0;

      for (const match of matchingPartners) {
        const referral = await this.createReferral(prequalificationId, match.partner.id);
        referrals.push(referral);
        
        // Calculate potential commission
        const commissionCalc = this.calculateCommission(
          prequalification.amountRequested,
          match.partner.referralCommissionRate || 0
        );
        totalCommissionPotential += commissionCalc.commissionAmount;
      }

      // Update prequalification status
      await db
        .update(loanPreQualifications)
        .set({
          status: matchingPartners.length > 0 ? 'matched' : 'no_match',
          updatedAt: new Date()
        })
        .where(eq(loanPreQualifications.id, prequalificationId));

      await SecurityLogger.logEvent(
        'loan_prequalification_processed',
        prequalification.userId,
        true,
        'system',
        'PartnerAPIService',
        {
          prequalificationId,
          matchesFound: matchingPartners.length,
          referralsCreated: referrals.length,
          totalCommissionPotential
        }
      );

      return {
        matches: matchingPartners,
        referralsCreated: referrals.length,
        totalCommissionPotential
      };

    } catch (error) {
      console.error('Error processing prequalification:', error);
      throw error;
    }
  }

  /**
   * Find matching loan partners based on prequalification criteria
   */
  private async findMatchingPartners(prequalification: LoanPreQualification): Promise<PrequalificationMatch[]> {
    const activePartners = await db
      .select()
      .from(loanPartners)
      .where(eq(loanPartners.isActive, true));

    const matches: PrequalificationMatch[] = [];

    for (const partner of activePartners) {
      const matchResult = this.evaluatePartnerMatch(prequalification, partner);
      if (matchResult.matchScore > 0) {
        matches.push({
          partner,
          matchScore: matchResult.matchScore,
          eligibilityReasons: matchResult.eligibilityReasons
        });
      }
    }

    // Sort by match score (highest first)
    return matches.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Evaluate if a partner matches the prequalification criteria
   */
  private evaluatePartnerMatch(prequalification: LoanPreQualification, partner: LoanPartner): {
    matchScore: number;
    eligibilityReasons: string[];
  } {
    let matchScore = 0;
    const eligibilityReasons: string[] = [];

    // Check loan amount range
    if (partner.minLoanAmount && partner.maxLoanAmount) {
      const requestedAmount = Number(prequalification.amountRequested);
      const minAmount = Number(partner.minLoanAmount);
      const maxAmount = Number(partner.maxLoanAmount);

      if (requestedAmount >= minAmount && requestedAmount <= maxAmount) {
        matchScore += 30;
        eligibilityReasons.push(`Loan amount ${prequalification.currency} ${requestedAmount.toLocaleString()} is within range`);
      } else {
        return { matchScore: 0, eligibilityReasons: ['Loan amount outside partner range'] };
      }
    }

    // Check supported countries
    if (partner.supportedCountries && partner.supportedCountries.length > 0) {
      if (prequalification.country && partner.supportedCountries.includes(prequalification.country)) {
        matchScore += 25;
        eligibilityReasons.push(`Available in ${prequalification.country}`);
      } else {
        return { matchScore: 0, eligibilityReasons: ['Country not supported'] };
      }
    }

    // Check supported currencies
    if (partner.supportedCurrencies && partner.supportedCurrencies.length > 0) {
      if (prequalification.currency && partner.supportedCurrencies.includes(prequalification.currency)) {
        matchScore += 20;
        eligibilityReasons.push(`Supports ${prequalification.currency} currency`);
      } else {
        matchScore -= 10;
        eligibilityReasons.push(`Currency ${prequalification.currency} may require conversion`);
      }
    }

    // Check eligibility criteria
    if (partner.eligibilityCriteria) {
      const criteria = partner.eligibilityCriteria as any;
      
      // Income requirements
      if (criteria.minIncome && prequalification.monthlyIncome) {
        const monthlyIncome = Number(prequalification.monthlyIncome);
        if (monthlyIncome >= criteria.minIncome) {
          matchScore += 15;
          eligibilityReasons.push(`Monthly income meets minimum requirement`);
        } else {
          matchScore -= 20;
          eligibilityReasons.push(`Monthly income below minimum requirement`);
        }
      }

      // Credit score requirements
      if (criteria.minCreditScore && prequalification.creditScore) {
        if (prequalification.creditScore >= criteria.minCreditScore) {
          matchScore += 10;
          eligibilityReasons.push(`Credit score meets minimum requirement`);
        } else {
          matchScore -= 15;
          eligibilityReasons.push(`Credit score below minimum requirement`);
        }
      }

      // Employment status
      if (criteria.acceptedEmploymentStatus && prequalification.employmentStatus) {
        if (criteria.acceptedEmploymentStatus.includes(prequalification.employmentStatus)) {
          matchScore += 10;
          eligibilityReasons.push(`Employment status accepted`);
        } else {
          matchScore -= 10;
          eligibilityReasons.push(`Employment status not preferred`);
        }
      }
    }

    return { matchScore: Math.max(0, matchScore), eligibilityReasons };
  }

  /**
   * Create a referral record for a partner
   */
  private async createReferral(prequalificationId: number, partnerId: number): Promise<LoanReferral> {
    const referralCode = generateReferralCode();
    const referralLink = generateTrackingLink(referralCode);

    const [referral] = await db
      .insert(loanReferrals)
      .values({
        preQualificationId: prequalificationId,
        partnerId,
        referralLink,
        referralCode,
        referralStatus: 'referred',
        referredAt: new Date(),
        lastStatusUpdate: new Date()
      })
      .returning();

    return referral;
  }

  /**
   * Calculate commission for a referral
   */
  private calculateCommission(loanAmount: string | number, commissionRate: string | number): CommissionCalculation {
    const baseAmount = Number(loanAmount);
    const rate = Number(commissionRate);
    const commissionAmount = baseAmount * rate;

    return {
      baseAmount,
      commissionRate: rate,
      commissionAmount,
      currency: 'USD' // Default currency
    };
  }

  /**
   * Update referral status from partner webhook
   */
  async updateReferralStatus(referralCode: string, status: string, partnerData: any): Promise<void> {
    try {
      const statusUpdates: any = {
        referralStatus: status,
        lastStatusUpdate: new Date(),
        partnerResponse: partnerData
      };

      // Set specific timestamp based on status
      switch (status) {
        case 'applied':
          statusUpdates.appliedAt = new Date();
          statusUpdates.applicationId = partnerData.applicationId;
          break;
        case 'approved':
          statusUpdates.approvedAt = new Date();
          statusUpdates.approvedAmount = partnerData.approvedAmount;
          statusUpdates.approvedRate = partnerData.approvedRate;
          // Calculate commission
          if (partnerData.approvedAmount) {
            const [referral] = await db
              .select()
              .from(loanReferrals)
              .innerJoin(loanPartners, eq(loanReferrals.partnerId, loanPartners.id))
              .where(eq(loanReferrals.referralCode, referralCode));

            if (referral) {
              const commission = this.calculateCommission(
                partnerData.approvedAmount,
                referral.loan_partners.referralCommissionRate || 0
              );
              statusUpdates.commissionEarned = commission.commissionAmount;
            }
          }
          break;
        case 'rejected':
          statusUpdates.rejectedAt = new Date();
          break;
      }

      await db
        .update(loanReferrals)
        .set(statusUpdates)
        .where(eq(loanReferrals.referralCode, referralCode));

      await SecurityLogger.logEvent(
        'loan_referral_status_updated',
        0, // System event
        true,
        'partner_webhook',
        'PartnerAPIService',
        {
          referralCode,
          status,
          partnerData: partnerData
        }
      );

    } catch (error) {
      console.error('Error updating referral status:', error);
      throw error;
    }
  }

  /**
   * Get referral analytics and commission summary
   */
  async getReferralAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalReferrals: number;
    totalCommissionEarned: number;
    totalCommissionPaid: number;
    statusBreakdown: Record<string, number>;
    topPartners: Array<{
      partnerId: number;
      partnerName: string;
      referralCount: number;
      commissionEarned: number;
    }>;
  }> {
    try {
      const dateConditions = [];
      if (startDate) {
        dateConditions.push(gte(loanReferrals.referredAt, startDate));
      }
      if (endDate) {
        dateConditions.push(lte(loanReferrals.referredAt, endDate));
      }

      // Get total referrals and commission data
      const [analytics] = await db
        .select({
          totalReferrals: sql<number>`COUNT(*)`,
          totalCommissionEarned: sql<number>`COALESCE(SUM(${loanReferrals.commissionEarned}), 0)`,
          totalCommissionPaid: sql<number>`COALESCE(SUM(CASE WHEN ${loanReferrals.commissionPaid} = true THEN ${loanReferrals.commissionEarned} ELSE 0 END), 0)`
        })
        .from(loanReferrals)
        .where(dateConditions.length > 0 ? and(...dateConditions) : undefined);

      // Get status breakdown
      const statusBreakdown = await db
        .select({
          status: loanReferrals.referralStatus,
          count: sql<number>`COUNT(*)`
        })
        .from(loanReferrals)
        .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
        .groupBy(loanReferrals.referralStatus);

      // Get top partners
      const topPartners = await db
        .select({
          partnerId: loanReferrals.partnerId,
          partnerName: loanPartners.name,
          referralCount: sql<number>`COUNT(*)`,
          commissionEarned: sql<number>`COALESCE(SUM(${loanReferrals.commissionEarned}), 0)`
        })
        .from(loanReferrals)
        .innerJoin(loanPartners, eq(loanReferrals.partnerId, loanPartners.id))
        .where(dateConditions.length > 0 ? and(...dateConditions) : undefined)
        .groupBy(loanReferrals.partnerId, loanPartners.name)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      return {
        totalReferrals: analytics.totalReferrals,
        totalCommissionEarned: analytics.totalCommissionEarned,
        totalCommissionPaid: analytics.totalCommissionPaid,
        statusBreakdown: statusBreakdown.reduce((acc, item) => {
          acc[item.status || 'unknown'] = item.count;
          return acc;
        }, {} as Record<string, number>),
        topPartners: topPartners
      };

    } catch (error) {
      console.error('Error getting referral analytics:', error);
      throw error;
    }
  }

  /**
   * Process commission payments
   */
  async processCommissionPayments(partnerId?: number): Promise<{
    processed: number;
    totalAmount: number;
    paymentIds: string[];
  }> {
    try {
      const conditions = [
        eq(loanReferrals.referralStatus, 'approved'),
        eq(loanReferrals.commissionPaid, false),
        sql`${loanReferrals.commissionEarned} > 0`
      ];

      if (partnerId) {
        conditions.push(eq(loanReferrals.partnerId, partnerId));
      }

      const unpaidCommissions = await db
        .select()
        .from(loanReferrals)
        .innerJoin(loanPartners, eq(loanReferrals.partnerId, loanPartners.id))
        .where(and(...conditions));

      const paymentIds: string[] = [];
      let totalAmount = 0;

      for (const commission of unpaidCommissions) {
        const paymentId = `PAY_${commission.loan_referrals.id}_${Date.now()}`;
        
        // Mark commission as paid
        await db
          .update(loanReferrals)
          .set({
            commissionPaid: true,
            notes: `Commission paid: ${paymentId}`
          })
          .where(eq(loanReferrals.id, commission.loan_referrals.id));

        paymentIds.push(paymentId);
        totalAmount += Number(commission.loan_referrals.commissionEarned);
      }

      await SecurityLogger.logEvent(
        'commission_payments_processed',
        0, // System event
        true,
        'system',
        'PartnerAPIService',
        {
          partnerId,
          processed: unpaidCommissions.length,
          totalAmount,
          paymentIds
        }
      );

      return {
        processed: unpaidCommissions.length,
        totalAmount,
        paymentIds
      };

    } catch (error) {
      console.error('Error processing commission payments:', error);
      throw error;
    }
  }

  /**
   * Get user referral history
   */
  async getUserReferralHistory(userId: number): Promise<Array<{
    referral: LoanReferral;
    partner: LoanPartner;
    prequalification: LoanPreQualification;
  }>> {
    try {
      const referralHistory = await db
        .select()
        .from(loanReferrals)
        .innerJoin(loanPartners, eq(loanReferrals.partnerId, loanPartners.id))
        .innerJoin(loanPreQualifications, eq(loanReferrals.preQualificationId, loanPreQualifications.id))
        .where(eq(loanPreQualifications.userId, userId))
        .orderBy(desc(loanReferrals.referredAt));

      return referralHistory.map(item => ({
        referral: item.loan_referrals,
        partner: item.loan_partners,
        prequalification: item.loan_pre_qualifications
      }));

    } catch (error) {
      console.error('Error getting user referral history:', error);
      throw error;
    }
  }
}

export const partnerApiService = new PartnerAPIService();