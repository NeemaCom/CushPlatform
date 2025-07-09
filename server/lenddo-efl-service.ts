// LenddoEFL Service - Alternative Data Scoring
// This service integrates with LenddoEFL for alternative credit scoring
// based on employment history, social data, and behavioral patterns

import { creditProfiles, creditReportData, creditProfileAuditLog } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

interface LenddoEFLScoreRequest {
  userId: number;
  employmentData?: {
    currentEmployment: boolean;
    monthlyIncome: number;
    employmentHistory: any[];
    jobTitle: string;
    companyName: string;
  };
  socialData?: {
    socialMediaProfiles: string[];
    networkSize: number;
    educationLevel: string;
  };
  behavioralData?: {
    appUsagePatterns: any;
    financialGoals: any[];
    communityEngagement: number;
  };
}

interface LenddoEFLScoreResponse {
  score: number; // 100-1000 scale
  scoreComponents: {
    identity: number;
    capacity: number;
    character: number;
    collateral: number;
    capital: number;
  };
  riskFactors: string[];
  strengths: string[];
  recommendations: string[];
}

class LenddoEFLService {
  private readonly baseUrl = process.env.LENDDO_EFL_API_URL || 'https://api.lenddo.com/v1';
  private readonly apiKey = process.env.LENDDO_EFL_API_KEY || '';
  private readonly clientId = process.env.LENDDO_EFL_CLIENT_ID || '';

  // Log audit events
  private async logAuditEvent(
    userId: number,
    creditProfileId: number | null,
    action: string,
    success: boolean = true,
    errorMessage?: string,
    metadata?: Record<string, any>
  ) {
    try {
      await db.insert(creditProfileAuditLog).values({
        userId,
        creditProfileId,
        action,
        provider: 'lenddo_efl',
        success,
        errorMessage,
        metadata,
      });
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  // Calculate alternative data score (stubbed for MVP)
  async calculateAlternativeDataScore(request: LenddoEFLScoreRequest): Promise<LenddoEFLScoreResponse> {
    try {
      const { userId, employmentData, socialData, behavioralData } = request;

      // Log the scoring request
      await this.logAuditEvent(
        userId,
        null,
        'lenddo_efl_score_requested',
        true,
        undefined,
        { hasEmploymentData: !!employmentData, hasSocialData: !!socialData, hasBehavioralData: !!behavioralData }
      );

      // Stub implementation - replace with actual LenddoEFL API call
      const mockScore = this.calculateMockScore(employmentData, socialData, behavioralData);

      // Find or create credit profile
      const existingProfile = await db.select()
        .from(creditProfiles)
        .where(eq(creditProfiles.userId, userId))
        .limit(1);

      if (existingProfile.length > 0) {
        // Update existing profile with LenddoEFL score
        await db.update(creditProfiles)
          .set({
            lenddoEFLScore: mockScore.score,
            lastUpdated: new Date(),
          })
          .where(eq(creditProfiles.id, existingProfile[0].id));

        // Store processed data
        await db.insert(creditReportData).values({
          userId,
          creditProfileId: existingProfile[0].id,
          provider: 'lenddo_efl',
          processedData: JSON.stringify(mockScore),
          reportType: 'alternative_score',
          reportStatus: 'complete',
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days expiry
        });
      }

      // Log successful scoring
      await this.logAuditEvent(
        userId,
        existingProfile[0]?.id || null,
        'lenddo_efl_score_completed',
        true,
        undefined,
        { score: mockScore.score }
      );

      return mockScore;
    } catch (error) {
      console.error('Failed to calculate alternative data score:', error);
      
      // Log the error
      await this.logAuditEvent(
        request.userId,
        null,
        'lenddo_efl_score_failed',
        false,
        error.message
      );

      throw error;
    }
  }

  // Mock score calculation for development/testing
  private calculateMockScore(
    employmentData?: LenddoEFLScoreRequest['employmentData'],
    socialData?: LenddoEFLScoreRequest['socialData'],
    behavioralData?: LenddoEFLScoreRequest['behavioralData']
  ): LenddoEFLScoreResponse {
    let baseScore = 500;
    
    // Employment data scoring
    if (employmentData) {
      if (employmentData.currentEmployment) baseScore += 50;
      if (employmentData.monthlyIncome > 3000) baseScore += 30;
      if (employmentData.employmentHistory.length > 0) baseScore += 20;
    }

    // Social data scoring
    if (socialData) {
      if (socialData.educationLevel === 'bachelors' || socialData.educationLevel === 'masters') baseScore += 25;
      if (socialData.networkSize > 100) baseScore += 15;
    }

    // Behavioral data scoring
    if (behavioralData) {
      if (behavioralData.financialGoals.length > 0) baseScore += 20;
      if (behavioralData.communityEngagement > 5) baseScore += 15;
    }

    // Ensure score is within valid range
    const finalScore = Math.max(100, Math.min(1000, baseScore));

    return {
      score: finalScore,
      scoreComponents: {
        identity: Math.max(100, Math.min(200, finalScore * 0.2)),
        capacity: Math.max(100, Math.min(200, finalScore * 0.25)),
        character: Math.max(100, Math.min(200, finalScore * 0.2)),
        collateral: Math.max(100, Math.min(200, finalScore * 0.15)),
        capital: Math.max(100, Math.min(200, finalScore * 0.2)),
      },
      riskFactors: this.identifyRiskFactors(employmentData, socialData, behavioralData),
      strengths: this.identifyStrengths(employmentData, socialData, behavioralData),
      recommendations: this.generateRecommendations(employmentData, socialData, behavioralData),
    };
  }

  private identifyRiskFactors(
    employmentData?: LenddoEFLScoreRequest['employmentData'],
    socialData?: LenddoEFLScoreRequest['socialData'],
    behavioralData?: LenddoEFLScoreRequest['behavioralData']
  ): string[] {
    const risks: string[] = [];

    if (!employmentData?.currentEmployment) risks.push('No current employment');
    if (employmentData?.monthlyIncome < 2000) risks.push('Low monthly income');
    if (socialData?.networkSize < 50) risks.push('Limited social network');
    if (behavioralData?.financialGoals.length === 0) risks.push('No financial goals set');

    return risks;
  }

  private identifyStrengths(
    employmentData?: LenddoEFLScoreRequest['employmentData'],
    socialData?: LenddoEFLScoreRequest['socialData'],
    behavioralData?: LenddoEFLScoreRequest['behavioralData']
  ): string[] {
    const strengths: string[] = [];

    if (employmentData?.currentEmployment) strengths.push('Currently employed');
    if (employmentData?.monthlyIncome > 4000) strengths.push('Strong income level');
    if (socialData?.educationLevel === 'masters' || socialData?.educationLevel === 'doctorate') {
      strengths.push('Advanced education');
    }
    if (behavioralData?.communityEngagement > 7) strengths.push('Active community participant');

    return strengths;
  }

  private generateRecommendations(
    employmentData?: LenddoEFLScoreRequest['employmentData'],
    socialData?: LenddoEFLScoreRequest['socialData'],
    behavioralData?: LenddoEFLScoreRequest['behavioralData']
  ): string[] {
    const recommendations: string[] = [];

    if (!employmentData?.currentEmployment) {
      recommendations.push('Secure stable employment to improve creditworthiness');
    }

    if (employmentData?.monthlyIncome < 3000) {
      recommendations.push('Consider opportunities to increase monthly income');
    }

    if (behavioralData?.financialGoals.length === 0) {
      recommendations.push('Set clear financial goals to demonstrate planning capability');
    }

    if (behavioralData?.communityEngagement < 5) {
      recommendations.push('Increase community engagement to build social capital');
    }

    return recommendations;
  }

  // Get alternative data score for user
  async getAlternativeDataScore(userId: number): Promise<any> {
    try {
      const reportData = await db.select()
        .from(creditReportData)
        .where(and(
          eq(creditReportData.userId, userId),
          eq(creditReportData.provider, 'lenddo_efl')
        ))
        .limit(1);

      if (reportData.length === 0) {
        return null;
      }

      return JSON.parse(reportData[0].processedData);
    } catch (error) {
      console.error('Failed to get alternative data score:', error);
      return null;
    }
  }
}

export const lenddoEFLService = new LenddoEFLService();