import { creditProfiles, creditReportData, creditProfileAuditLog, CreditProfile } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

interface NovaCreditInitiateResponse {
  redirectUrl: string;
  sessionId: string;
  reportId: string;
}

interface NovaCreditReport {
  reportId: string;
  score: number;
  status: string;
  creditHistory: any[];
  personalInfo: any;
  accounts: any[];
  inquiries: any[];
  publicRecords: any[];
}

interface NovaCreditWebhookData {
  reportId: string;
  status: string;
  score?: number;
  report?: NovaCreditReport;
  error?: string;
}

class NovaCreditService {
  private readonly baseUrl = process.env.NOVA_CREDIT_API_URL || 'https://api.novacredit.com/v1';
  private readonly apiKey = process.env.NOVA_CREDIT_API_KEY || '';
  private readonly clientSecret = process.env.NOVA_CREDIT_CLIENT_SECRET || '';

  // Encrypt sensitive data before storing
  private encryptData(data: any): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.clientSecret);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  // Decrypt sensitive data when reading
  private decryptData(encryptedData: string): any {
    try {
      const decipher = crypto.createDecipher('aes-256-cbc', this.clientSecret);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to decrypt data:', error);
      return null;
    }
  }

  // Log audit events
  private async logAuditEvent(
    userId: number,
    creditProfileId: number | null,
    action: string,
    provider: string = 'nova_credit',
    success: boolean = true,
    errorMessage?: string,
    ipAddress?: string,
    userAgent?: string,
    metadata?: Record<string, any>
  ) {
    try {
      await db.insert(creditProfileAuditLog).values({
        userId,
        creditProfileId,
        action,
        provider,
        success,
        errorMessage,
        ipAddress,
        userAgent,
        metadata,
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  // Initiate Nova Credit process
  async initiateNovaCreditProcess(
    userId: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<NovaCreditInitiateResponse> {
    try {
      // Check if user already has a credit profile
      const existingProfile = await db.select()
        .from(creditProfiles)
        .where(eq(creditProfiles.userId, userId))
        .limit(1);

      let creditProfile: CreditProfile;
      
      if (existingProfile.length > 0) {
        creditProfile = existingProfile[0];
      } else {
        // Create new credit profile
        const [newProfile] = await db.insert(creditProfiles).values({
          userId,
          status: 'pending',
          consentGiven: true,
          consentDate: new Date(),
        }).returning();
        creditProfile = newProfile;
      }

      // Simulate Nova Credit API call (replace with actual API integration)
      const reportId = `nova_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // In production, this would be a real API call to Nova Credit
      const mockResponse: NovaCreditInitiateResponse = {
        redirectUrl: `https://secure.novacredit.com/connect?session=${sessionId}&return_url=${encodeURIComponent(process.env.FRONTEND_URL || 'http://localhost:5000')}/credit-passport/callback`,
        sessionId,
        reportId,
      };

      // Store the report ID in the credit profile
      await db.update(creditProfiles)
        .set({ 
          novaCreditReportId: reportId,
          lastUpdated: new Date(),
        })
        .where(eq(creditProfiles.id, creditProfile.id));

      // Log the initiation
      await this.logAuditEvent(
        userId,
        creditProfile.id,
        'nova_credit_initiated',
        'nova_credit',
        true,
        undefined,
        ipAddress,
        userAgent,
        { reportId, sessionId }
      );

      return mockResponse;
    } catch (error) {
      console.error('Failed to initiate Nova Credit process:', error);
      
      // Log the error
      await this.logAuditEvent(
        userId,
        null,
        'nova_credit_initiation_failed',
        'nova_credit',
        false,
        error.message,
        ipAddress,
        userAgent
      );

      throw new Error('Failed to initiate Nova Credit process');
    }
  }

  // Handle Nova Credit webhook
  async handleNovaCreditWebhook(webhookData: NovaCreditWebhookData): Promise<void> {
    try {
      const { reportId, status, score, report, error } = webhookData;

      // Find the credit profile by report ID
      const creditProfile = await db.select()
        .from(creditProfiles)
        .where(eq(creditProfiles.novaCreditReportId, reportId))
        .limit(1);

      if (creditProfile.length === 0) {
        throw new Error(`Credit profile not found for report ID: ${reportId}`);
      }

      const profile = creditProfile[0];

      // Update credit profile based on webhook data
      let updateData: any = {
        lastUpdated: new Date(),
      };

      if (status === 'complete' && score && report) {
        updateData.novaCreditScore = score;
        updateData.status = 'complete';
        
        // Store encrypted report data
        const encryptedRawData = this.encryptData(report);
        const encryptedProcessedData = this.encryptData({
          score,
          accounts: report.accounts?.length || 0,
          inquiries: report.inquiries?.length || 0,
          publicRecords: report.publicRecords?.length || 0,
          creditHistoryLength: report.creditHistory?.length || 0,
        });

        await db.insert(creditReportData).values({
          userId: profile.userId,
          creditProfileId: profile.id,
          provider: 'nova_credit',
          rawData: encryptedRawData,
          processedData: encryptedProcessedData,
          reportType: 'credit_report',
          reportStatus: 'complete',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry
        });

        // Calculate Cush Credit Score
        const cushScore = this.calculateCushCreditScore(score, report);
        updateData.cushCreditScore = cushScore;

        // Log successful completion
        await this.logAuditEvent(
          profile.userId,
          profile.id,
          'nova_credit_completed',
          'nova_credit',
          true,
          undefined,
          undefined,
          undefined,
          { score, cushScore }
        );
      } else if (status === 'error' || error) {
        updateData.status = 'error';
        
        // Log the error
        await this.logAuditEvent(
          profile.userId,
          profile.id,
          'nova_credit_error',
          'nova_credit',
          false,
          error || 'Unknown error',
          undefined,
          undefined,
          webhookData
        );
      }

      // Update the credit profile
      await db.update(creditProfiles)
        .set(updateData)
        .where(eq(creditProfiles.id, profile.id));

    } catch (error) {
      console.error('Failed to handle Nova Credit webhook:', error);
      throw error;
    }
  }

  // Calculate Cush Credit Score based on Nova Credit data
  private calculateCushCreditScore(novaCreditScore: number, report: NovaCreditReport): number {
    // Basic algorithm - can be enhanced with more sophisticated logic
    let cushScore = novaCreditScore;
    
    // Adjust based on credit history length
    if (report.creditHistory && report.creditHistory.length > 0) {
      const avgHistoryLength = report.creditHistory.reduce((sum, item) => sum + (item.ageInMonths || 0), 0) / report.creditHistory.length;
      if (avgHistoryLength > 24) cushScore += 10; // Bonus for longer history
    }
    
    // Adjust based on number of accounts
    if (report.accounts && report.accounts.length > 0) {
      const activeAccounts = report.accounts.filter(acc => acc.status === 'active').length;
      if (activeAccounts >= 3 && activeAccounts <= 7) cushScore += 5; // Optimal account mix
    }
    
    // Penalize for public records
    if (report.publicRecords && report.publicRecords.length > 0) {
      cushScore -= report.publicRecords.length * 15;
    }
    
    // Ensure score is within valid range
    return Math.max(300, Math.min(850, cushScore));
  }

  // Get credit profile for user
  async getCreditProfile(userId: number): Promise<any> {
    try {
      const profile = await db.select()
        .from(creditProfiles)
        .where(eq(creditProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        return null;
      }

      // Get associated report data
      const reportData = await db.select()
        .from(creditReportData)
        .where(and(
          eq(creditReportData.userId, userId),
          eq(creditReportData.creditProfileId, profile[0].id)
        ));

      return {
        ...profile[0],
        reportData: reportData.map(data => ({
          ...data,
          rawData: undefined, // Don't return raw data for security
          processedData: data.processedData ? this.decryptData(data.processedData) : null,
        })),
      };
    } catch (error) {
      console.error('Failed to get credit profile:', error);
      return null;
    }
  }

  // Get credit profile status
  async getCreditProfileStatus(userId: number): Promise<{
    status: string;
    novaCreditScore?: number;
    cushCreditScore?: number;
    lastUpdated?: Date;
  }> {
    try {
      const profile = await db.select()
        .from(creditProfiles)
        .where(eq(creditProfiles.userId, userId))
        .limit(1);

      if (profile.length === 0) {
        return { status: 'not_started' };
      }

      const p = profile[0];
      return {
        status: p.status,
        novaCreditScore: p.novaCreditScore,
        cushCreditScore: p.cushCreditScore,
        lastUpdated: p.lastUpdated,
      };
    } catch (error) {
      console.error('Failed to get credit profile status:', error);
      return { status: 'error' };
    }
  }
}

export const novaCreditService = new NovaCreditService();