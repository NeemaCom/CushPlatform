// Credit Score Calculator for Cush Credit Passport
// Combines Nova Credit, LenddoEFL, and internal data to generate comprehensive Cush Credit Score

interface CreditScoreInputs {
  novaCreditScore?: number;
  lenddoEFLScore?: number;
  employmentHistory?: {
    currentEmployment: boolean;
    monthlyIncome: number;
    employmentLengthMonths: number;
    jobStability: number; // 1-10 scale
  };
  financialData?: {
    totalBalance: number;
    savingsRate: number;
    monthlySpending: number;
    debtToIncomeRatio: number;
  };
  migrationProfile?: {
    timeInCountry: number; // months
    visaStatus: string;
    educationLevel: string;
    languageProficiency: number; // 1-10 scale
  };
  behavioralData?: {
    appEngagement: number; // 1-10 scale
    financialGoalsCompleted: number;
    communityParticipation: number; // 1-10 scale
  };
}

interface CreditScoreResult {
  cushCreditScore: number;
  scoreBreakdown: {
    crossBorderCreditHistory: number;
    alternativeData: number;
    employmentStability: number;
    financialBehavior: number;
    migrationProfile: number;
    platformEngagement: number;
  };
  riskFactors: string[];
  strengthFactors: string[];
  recommendations: string[];
  confidenceLevel: number; // 1-10 scale
}

export class CreditScoreCalculator {
  // Base score range: 300-850 (aligned with traditional credit scores)
  private readonly MIN_SCORE = 300;
  private readonly MAX_SCORE = 850;
  private readonly BASE_SCORE = 500;

  // Weighting factors for different components
  private readonly WEIGHTS = {
    crossBorderCredit: 0.35,    // 35% - Nova Credit data
    alternativeData: 0.20,      // 20% - LenddoEFL data
    employmentStability: 0.15,  // 15% - Employment history
    financialBehavior: 0.15,    // 15% - Financial patterns
    migrationProfile: 0.10,     // 10% - Migration-specific factors
    platformEngagement: 0.05,   // 5% - App usage and engagement
  };

  public calculateCushCreditScore(inputs: CreditScoreInputs): CreditScoreResult {
    const breakdown = {
      crossBorderCreditHistory: this.calculateCrossBorderScore(inputs.novaCreditScore),
      alternativeData: this.calculateAlternativeDataScore(inputs.lenddoEFLScore),
      employmentStability: this.calculateEmploymentScore(inputs.employmentHistory),
      financialBehavior: this.calculateFinancialBehaviorScore(inputs.financialData),
      migrationProfile: this.calculateMigrationScore(inputs.migrationProfile),
      platformEngagement: this.calculatePlatformEngagementScore(inputs.behavioralData),
    };

    // Calculate weighted score
    const weightedScore = 
      (breakdown.crossBorderCreditHistory * this.WEIGHTS.crossBorderCredit) +
      (breakdown.alternativeData * this.WEIGHTS.alternativeData) +
      (breakdown.employmentStability * this.WEIGHTS.employmentStability) +
      (breakdown.financialBehavior * this.WEIGHTS.financialBehavior) +
      (breakdown.migrationProfile * this.WEIGHTS.migrationProfile) +
      (breakdown.platformEngagement * this.WEIGHTS.platformEngagement);

    // Normalize to final score range
    const cushCreditScore = Math.max(this.MIN_SCORE, Math.min(this.MAX_SCORE, Math.round(weightedScore)));

    // Generate risk and strength factors
    const riskFactors = this.identifyRiskFactors(inputs, breakdown);
    const strengthFactors = this.identifyStrengthFactors(inputs, breakdown);
    const recommendations = this.generateRecommendations(inputs, breakdown, cushCreditScore);
    const confidenceLevel = this.calculateConfidenceLevel(inputs);

    return {
      cushCreditScore,
      scoreBreakdown: breakdown,
      riskFactors,
      strengthFactors,
      recommendations,
      confidenceLevel,
    };
  }

  private calculateCrossBorderScore(novaCreditScore?: number): number {
    if (!novaCreditScore) return this.BASE_SCORE * 0.6; // Lower score without foreign credit
    
    // Nova Credit scores typically range 300-850
    return Math.max(300, Math.min(850, novaCreditScore));
  }

  private calculateAlternativeDataScore(lenddoEFLScore?: number): number {
    if (!lenddoEFLScore) return this.BASE_SCORE * 0.7; // Moderate score without alternative data
    
    // LenddoEFL scores typically range 100-1000, normalize to 300-850
    const normalizedScore = 300 + ((lenddoEFLScore - 100) / 900) * 550;
    return Math.max(300, Math.min(850, normalizedScore));
  }

  private calculateEmploymentScore(employment?: CreditScoreInputs['employmentHistory']): number {
    if (!employment) return this.BASE_SCORE * 0.6;

    let score = this.BASE_SCORE;

    // Current employment bonus
    if (employment.currentEmployment) score += 50;

    // Monthly income factor (higher income = higher score)
    if (employment.monthlyIncome > 0) {
      const incomeScore = Math.min(100, (employment.monthlyIncome / 5000) * 100);
      score += incomeScore;
    }

    // Employment length bonus
    if (employment.employmentLengthMonths > 0) {
      const lengthBonus = Math.min(75, employment.employmentLengthMonths * 2);
      score += lengthBonus;
    }

    // Job stability factor
    score += (employment.jobStability - 5) * 20;

    return Math.max(300, Math.min(850, score));
  }

  private calculateFinancialBehaviorScore(financial?: CreditScoreInputs['financialData']): number {
    if (!financial) return this.BASE_SCORE * 0.7;

    let score = this.BASE_SCORE;

    // Savings rate bonus
    if (financial.savingsRate > 0) {
      score += Math.min(100, financial.savingsRate * 200); // Up to 50% savings rate
    }

    // Total balance factor
    if (financial.totalBalance > 0) {
      const balanceScore = Math.min(75, (financial.totalBalance / 10000) * 75);
      score += balanceScore;
    }

    // Debt-to-income ratio penalty
    if (financial.debtToIncomeRatio > 0) {
      const debtPenalty = Math.min(100, financial.debtToIncomeRatio * 200);
      score -= debtPenalty;
    }

    return Math.max(300, Math.min(850, score));
  }

  private calculateMigrationScore(migration?: CreditScoreInputs['migrationProfile']): number {
    if (!migration) return this.BASE_SCORE * 0.8;

    let score = this.BASE_SCORE;

    // Time in country bonus
    if (migration.timeInCountry > 0) {
      const timeBonus = Math.min(50, migration.timeInCountry * 2);
      score += timeBonus;
    }

    // Visa status factor
    const visaScores = {
      'citizen': 50,
      'permanent_resident': 40,
      'work_visa': 30,
      'student_visa': 20,
      'tourist_visa': 10,
    };
    score += visaScores[migration.visaStatus] || 15;

    // Education level factor
    const educationScores = {
      'doctorate': 30,
      'masters': 25,
      'bachelors': 20,
      'associates': 15,
      'high_school': 10,
      'other': 5,
    };
    score += educationScores[migration.educationLevel] || 10;

    // Language proficiency
    score += (migration.languageProficiency - 5) * 10;

    return Math.max(300, Math.min(850, score));
  }

  private calculatePlatformEngagementScore(behavioral?: CreditScoreInputs['behavioralData']): number {
    if (!behavioral) return this.BASE_SCORE * 0.9;

    let score = this.BASE_SCORE;

    // App engagement bonus
    score += (behavioral.appEngagement - 5) * 15;

    // Financial goals completion
    score += behavioral.financialGoalsCompleted * 20;

    // Community participation
    score += (behavioral.communityParticipation - 5) * 10;

    return Math.max(300, Math.min(850, score));
  }

  private identifyRiskFactors(inputs: CreditScoreInputs, breakdown: any): string[] {
    const risks: string[] = [];

    if (!inputs.novaCreditScore) risks.push('No foreign credit history available');
    if (inputs.novaCreditScore && inputs.novaCreditScore < 600) risks.push('Low foreign credit score');
    if (inputs.employmentHistory?.currentEmployment === false) risks.push('Currently unemployed');
    if (inputs.financialData?.debtToIncomeRatio > 0.4) risks.push('High debt-to-income ratio');
    if (inputs.migrationProfile?.timeInCountry < 6) risks.push('Recently arrived in country');
    if (inputs.financialData?.savingsRate < 0.1) risks.push('Low savings rate');

    return risks;
  }

  private identifyStrengthFactors(inputs: CreditScoreInputs, breakdown: any): string[] {
    const strengths: string[] = [];

    if (inputs.novaCreditScore && inputs.novaCreditScore >= 700) strengths.push('Strong foreign credit history');
    if (inputs.employmentHistory?.employmentLengthMonths > 24) strengths.push('Stable employment history');
    if (inputs.financialData?.savingsRate > 0.2) strengths.push('High savings rate');
    if (inputs.migrationProfile?.timeInCountry > 12) strengths.push('Well-established in country');
    if (inputs.financialData?.totalBalance > 5000) strengths.push('Strong financial reserves');
    if (inputs.employmentHistory?.monthlyIncome > 4000) strengths.push('Good income level');

    return strengths;
  }

  private generateRecommendations(inputs: CreditScoreInputs, breakdown: any, score: number): string[] {
    const recommendations: string[] = [];

    if (score < 550) {
      recommendations.push('Focus on building financial history through consistent savings');
      recommendations.push('Consider secured credit products to establish local credit');
    }

    if (!inputs.novaCreditScore) {
      recommendations.push('Complete Nova Credit verification to unlock foreign credit history');
    }

    if (inputs.financialData?.savingsRate < 0.15) {
      recommendations.push('Increase monthly savings rate to improve financial stability');
    }

    if (inputs.employmentHistory?.employmentLengthMonths < 12) {
      recommendations.push('Maintain current employment to build stability profile');
    }

    if (inputs.migrationProfile?.languageProficiency < 7) {
      recommendations.push('Improve language skills to enhance employment prospects');
    }

    return recommendations;
  }

  private calculateConfidenceLevel(inputs: CreditScoreInputs): number {
    let confidence = 5; // Base confidence

    // Increase confidence with more data points
    if (inputs.novaCreditScore) confidence += 2;
    if (inputs.lenddoEFLScore) confidence += 1;
    if (inputs.employmentHistory) confidence += 1;
    if (inputs.financialData) confidence += 1;
    if (inputs.migrationProfile) confidence += 0.5;

    return Math.max(1, Math.min(10, confidence));
  }
}

export const creditScoreCalculator = new CreditScoreCalculator();