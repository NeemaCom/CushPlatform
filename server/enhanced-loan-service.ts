import { db } from './db';
import { 
  loanPreQualifications, 
  loanReferrals, 
  loanPartners, 
  loanApplications, 
  loanProviders,
  users 
} from '@shared/schema';
import { eq, and, desc, sql, gte, lte, or } from 'drizzle-orm';
import { partnerApiService } from './partner-api-service';
import { SecurityLogger } from './security';
import { generateReferralCode, generateTrackingLink, generatePartnerApplicationUrl } from '../utils/referral-utils';
import type { 
  InsertLoanPreQualification, 
  InsertLoanApplication,
  LoanPreQualification,
  LoanReferral,
  LoanPartner,
  LoanApplication
} from '@shared/schema';

interface EnhancedLoanApplication extends LoanApplication {
  referralCode?: string;
  partnerTrackingUrl?: string;
  prequalificationData?: LoanPreQualification;
}

interface LoanApplicationWorkflow {
  prequalification: LoanPreQualification;
  matchingPartners: Array<{
    partner: LoanPartner;
    referral: LoanReferral;
    applicationUrl: string;
    estimatedCommission: number;
  }>;
  totalPotentialCommission: number;
  workflowStatus: 'initiated' | 'matched' | 'no_matches' | 'applications_sent';
}

export class EnhancedLoanService {
  
  /**
   * Enhanced prequalification with automatic partner matching and referral creation
   */
  async processEnhancedPrequalification(
    userId: number, 
    prequalData: InsertLoanPreQualification
  ): Promise<LoanApplicationWorkflow> {
    try {
      // Create prequalification record
      const [prequalification] = await db
        .insert(loanPreQualifications)
        .values({
          ...prequalData,
          userId,
          status: 'processing'
        })
        .returning();

      // Process matching through partner API service
      const matchingResult = await partnerApiService.processPrequalification(prequalification.id);
      
      // Build partner application URLs and calculate commissions
      const matchingPartners = [];
      let totalPotentialCommission = 0;

      for (const match of matchingResult.matches) {
        // Get referral for this partner
        const [referral] = await db
          .select()
          .from(loanReferrals)
          .where(and(
            eq(loanReferrals.preQualificationId, prequalification.id),
            eq(loanReferrals.partnerId, match.partner.id)
          ));

        if (referral) {
          const applicationUrl = generatePartnerApplicationUrl(
            match.partner.website || '',
            referral.referralCode,
            userId
          );

          const estimatedCommission = Number(prequalData.amountRequested) * Number(match.partner.referralCommissionRate || 0);
          totalPotentialCommission += estimatedCommission;

          matchingPartners.push({
            partner: match.partner,
            referral,
            applicationUrl,
            estimatedCommission
          });
        }
      }

      const workflowStatus = matchingPartners.length > 0 ? 'matched' : 'no_matches';

      await SecurityLogger.logEvent(
        'enhanced_prequalification_processed',
        userId,
        true,
        'system',
        'EnhancedLoanService',
        {
          prequalificationId: prequalification.id,
          matchesFound: matchingPartners.length,
          totalPotentialCommission
        }
      );

      return {
        prequalification,
        matchingPartners,
        totalPotentialCommission,
        workflowStatus
      };

    } catch (error) {
      console.error('Error processing enhanced prequalification:', error);
      throw error;
    }
  }

  /**
   * Create loan application with referral tracking
   */
  async createLoanApplicationWithReferral(
    userId: number,
    applicationData: InsertLoanApplication,
    referralCode?: string
  ): Promise<EnhancedLoanApplication> {
    try {
      // Create base loan application
      const [loanApplication] = await db
        .insert(loanApplications)
        .values({
          ...applicationData,
          userId,
          status: 'pending'
        })
        .returning();

      let referralTracking = null;
      
      // If referral code provided, link to referral system
      if (referralCode) {
        const [referral] = await db
          .select()
          .from(loanReferrals)
          .innerJoin(loanPartners, eq(loanReferrals.partnerId, loanPartners.id))
          .where(eq(loanReferrals.referralCode, referralCode));

        if (referral) {
          // Update referral status to 'applied'
          await db
            .update(loanReferrals)
            .set({
              referralStatus: 'applied',
              appliedAt: new Date(),
              applicationId: loanApplication.id.toString(),
              lastStatusUpdate: new Date()
            })
            .where(eq(loanReferrals.referralCode, referralCode));

          referralTracking = {
            referralCode,
            partnerId: referral.loan_partners.id,
            partnerName: referral.loan_partners.name
          };
        }
      }

      // Get prequalification data if linked
      let prequalificationData = null;
      if (loanApplication.prequalificationId) {
        const [prequalResult] = await db
          .select()
          .from(loanPreQualifications)
          .where(eq(loanPreQualifications.id, loanApplication.prequalificationId));
        
        prequalificationData = prequalResult;
      }

      await SecurityLogger.logEvent(
        'loan_application_created_with_referral',
        userId,
        true,
        'system',
        'EnhancedLoanService',
        {
          applicationId: loanApplication.id,
          referralCode,
          referralTracking
        }
      );

      return {
        ...loanApplication,
        referralCode,
        prequalificationData,
        partnerTrackingUrl: referralTracking ? generatePartnerApplicationUrl(
          referralTracking.partnerName,
          referralCode,
          userId
        ) : undefined
      };

    } catch (error) {
      console.error('Error creating loan application with referral:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive loan application status including referral tracking
   */
  async getLoanApplicationStatus(applicationId: number): Promise<{
    application: LoanApplication;
    referralStatus?: LoanReferral;
    partnerInfo?: LoanPartner;
    commissionTracking?: {
      potentialCommission: number;
      commissionEarned: number;
      commissionPaid: boolean;
    };
  }> {
    try {
      // Get application details
      const [application] = await db
        .select()
        .from(loanApplications)
        .where(eq(loanApplications.id, applicationId));

      if (!application) {
        throw new Error('Loan application not found');
      }

      // Get referral information if exists
      const [referralInfo] = await db
        .select()
        .from(loanReferrals)
        .innerJoin(loanPartners, eq(loanReferrals.partnerId, loanPartners.id))
        .where(eq(loanReferrals.applicationId, applicationId.toString()));

      let commissionTracking = null;
      if (referralInfo) {
        const potentialCommission = Number(application.amount) * Number(referralInfo.loan_partners.referralCommissionRate || 0);
        commissionTracking = {
          potentialCommission,
          commissionEarned: Number(referralInfo.loan_referrals.commissionEarned || 0),
          commissionPaid: referralInfo.loan_referrals.commissionPaid || false
        };
      }

      return {
        application,
        referralStatus: referralInfo?.loan_referrals,
        partnerInfo: referralInfo?.loan_partners,
        commissionTracking
      };

    } catch (error) {
      console.error('Error getting loan application status:', error);
      throw error;
    }
  }

  /**
   * Process partner webhook for loan application updates
   */
  async processPartnerWebhook(
    referralCode: string,
    webhookData: {
      status: string;
      applicationId?: string;
      approvedAmount?: number;
      approvedRate?: number;
      rejectionReason?: string;
      additionalData?: any;
    }
  ): Promise<void> {
    try {
      await partnerApiService.updateReferralStatus(
        referralCode,
        webhookData.status,
        webhookData
      );

      // Update linked loan application if exists
      if (webhookData.applicationId) {
        const statusMapping: Record<string, string> = {
          'approved': 'approved',
          'rejected': 'rejected',
          'under_review': 'under_review',
          'pending': 'pending'
        };

        const applicationStatus = statusMapping[webhookData.status] || 'pending';
        
        await db
          .update(loanApplications)
          .set({
            status: applicationStatus,
            ...(webhookData.approvedAmount && { amount: webhookData.approvedAmount }),
            ...(webhookData.approvedRate && { interestRate: webhookData.approvedRate }),
            ...(webhookData.rejectionReason && { 
              applicationData: sql`COALESCE(${loanApplications.applicationData}, '{}')::jsonb || ${{ rejectionReason: webhookData.rejectionReason }}::jsonb`
            }),
            updatedAt: new Date()
          })
          .where(eq(loanApplications.id, parseInt(webhookData.applicationId)));
      }

      await SecurityLogger.logEvent(
        'partner_webhook_processed',
        0, // System event
        true,
        'partner_webhook',
        'EnhancedLoanService',
        {
          referralCode,
          webhookData
        }
      );

    } catch (error) {
      console.error('Error processing partner webhook:', error);
      throw error;
    }
  }

  /**
   * Get user's loan journey with referral tracking
   */
  async getUserLoanJourney(userId: number): Promise<{
    prequalifications: LoanPreQualification[];
    applications: EnhancedLoanApplication[];
    referrals: Array<{
      referral: LoanReferral;
      partner: LoanPartner;
      application?: LoanApplication;
    }>;
    totalCommissionEarned: number;
    totalCommissionPending: number;
  }> {
    try {
      // Get prequalifications
      const prequalifications = await db
        .select()
        .from(loanPreQualifications)
        .where(eq(loanPreQualifications.userId, userId))
        .orderBy(desc(loanPreQualifications.createdAt));

      // Get applications
      const applications = await db
        .select()
        .from(loanApplications)
        .where(eq(loanApplications.userId, userId))
        .orderBy(desc(loanApplications.createdAt));

      // Get referrals with partner information
      const referrals = await db
        .select()
        .from(loanReferrals)
        .innerJoin(loanPartners, eq(loanReferrals.partnerId, loanPartners.id))
        .innerJoin(loanPreQualifications, eq(loanReferrals.preQualificationId, loanPreQualifications.id))
        .where(eq(loanPreQualifications.userId, userId))
        .orderBy(desc(loanReferrals.referredAt));

      // Calculate commission totals
      const [commissionSummary] = await db
        .select({
          totalCommissionEarned: sql<number>`COALESCE(SUM(CASE WHEN ${loanReferrals.commissionPaid} = true THEN ${loanReferrals.commissionEarned} ELSE 0 END), 0)`,
          totalCommissionPending: sql<number>`COALESCE(SUM(CASE WHEN ${loanReferrals.commissionPaid} = false AND ${loanReferrals.commissionEarned} > 0 THEN ${loanReferrals.commissionEarned} ELSE 0 END), 0)`
        })
        .from(loanReferrals)
        .innerJoin(loanPreQualifications, eq(loanReferrals.preQualificationId, loanPreQualifications.id))
        .where(eq(loanPreQualifications.userId, userId));

      // Link applications to referrals
      const referralData = referrals.map(item => {
        const linkedApplication = applications.find(app => 
          app.id.toString() === item.loan_referrals.applicationId
        );
        
        return {
          referral: item.loan_referrals,
          partner: item.loan_partners,
          application: linkedApplication
        };
      });

      return {
        prequalifications,
        applications,
        referrals: referralData,
        totalCommissionEarned: commissionSummary.totalCommissionEarned,
        totalCommissionPending: commissionSummary.totalCommissionPending
      };

    } catch (error) {
      console.error('Error getting user loan journey:', error);
      throw error;
    }
  }

  /**
   * Get commission analytics for admin dashboard
   */
  async getCommissionAnalytics(startDate?: Date, endDate?: Date): Promise<{
    totalCommissionGenerated: number;
    totalCommissionPaid: number;
    pendingCommissions: number;
    topPerformingPartners: Array<{
      partner: LoanPartner;
      totalCommission: number;
      referralCount: number;
      conversionRate: number;
    }>;
    monthlyTrends: Array<{
      month: string;
      referrals: number;
      approvals: number;
      commissionEarned: number;
    }>;
  }> {
    try {
      return await partnerApiService.getReferralAnalytics(startDate, endDate);
    } catch (error) {
      console.error('Error getting commission analytics:', error);
      throw error;
    }
  }

  /**
   * Process bulk commission payments
   */
  async processBulkCommissionPayments(partnerId?: number): Promise<{
    processed: number;
    totalAmount: number;
    paymentIds: string[];
  }> {
    try {
      return await partnerApiService.processCommissionPayments(partnerId);
    } catch (error) {
      console.error('Error processing bulk commission payments:', error);
      throw error;
    }
  }
}

export const enhancedLoanService = new EnhancedLoanService();