import { analyzeFinancialMood, type FinancialMoodData } from './mood-analyzer';

export interface FinancialHealthMetrics {
  savingsRate: {
    score: number;
    label: string;
    color: string;
    value: number;
    benchmark: string;
  };
  budgetControl: {
    score: number;
    label: string;
    color: string;
    value: number;
    benchmark: string;
  };
  emergencyFund: {
    score: number;
    label: string;
    color: string;
    value: number;
    benchmark: string;
  };
  debtToIncome: {
    score: number;
    label: string;
    color: string;
    value: number;
    benchmark: string;
  };
  goalProgress: {
    score: number;
    label: string;
    color: string;
    value: number;
    benchmark: string;
  };
  diversification: {
    score: number;
    label: string;
    color: string;
    value: number;
    benchmark: string;
  };
}

export interface FinancialHealthRadar {
  overallScore: number;
  overallGrade: string;
  overallColor: string;
  metrics: FinancialHealthMetrics;
  recommendations: string[];
  strengths: string[];
  improvements: string[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface FinancialHealthData extends FinancialMoodData {
  monthlyDebtPayments: number;
  accountTypes: string[];
  goalCompletionRate: number;
}

function calculateMetricScore(value: number, thresholds: { excellent: number; good: number; fair: number }): { score: number; label: string; color: string } {
  if (value >= thresholds.excellent) {
    return { score: 10, label: 'Excellent', color: '#22c55e' };
  } else if (value >= thresholds.good) {
    return { score: 8, label: 'Good', color: '#84cc16' };
  } else if (value >= thresholds.fair) {
    return { score: 6, label: 'Fair', color: '#eab308' };
  } else {
    return { score: 4, label: 'Needs Improvement', color: '#f97316' };
  }
}

function calculateInverseMetricScore(value: number, thresholds: { excellent: number; good: number; fair: number }): { score: number; label: string; color: string } {
  if (value <= thresholds.excellent) {
    return { score: 10, label: 'Excellent', color: '#22c55e' };
  } else if (value <= thresholds.good) {
    return { score: 8, label: 'Good', color: '#84cc16' };
  } else if (value <= thresholds.fair) {
    return { score: 6, label: 'Fair', color: '#eab308' };
  } else {
    return { score: 4, label: 'Needs Improvement', color: '#f97316' };
  }
}

export async function analyzeFinancialHealth(data: FinancialHealthData): Promise<FinancialHealthRadar> {
  try {
    // Calculate individual metrics
    
    // 1. Savings Rate (20% excellent, 15% good, 10% fair)
    const savingsRateScore = calculateMetricScore(data.savingsRate, {
      excellent: 20,
      good: 15,
      fair: 10
    });

    // 2. Budget Control (expense variance - lower is better)
    const expenseVariance = Math.abs((data.monthlyExpenses / data.monthlyIncome) * 100 - 80); // Target 80% expense ratio
    const budgetControlScore = calculateInverseMetricScore(expenseVariance, {
      excellent: 5,
      good: 10,
      fair: 15
    });

    // 3. Emergency Fund (months of expenses covered)
    const monthsOfExpenses = data.totalBalance / (data.monthlyExpenses || 1);
    const emergencyFundScore = calculateMetricScore(monthsOfExpenses, {
      excellent: 6,
      good: 3,
      fair: 1
    });

    // 4. Debt to Income (lower is better)
    const debtToIncomeRatio = (data.monthlyDebtPayments / data.monthlyIncome) * 100;
    const debtToIncomeScore = calculateInverseMetricScore(debtToIncomeRatio, {
      excellent: 10,
      good: 20,
      fair: 30
    });

    // 5. Goal Progress
    const goalProgressScore = calculateMetricScore(data.goalCompletionRate, {
      excellent: 80,
      good: 60,
      fair: 30
    });

    // 6. Diversification (account types)
    const diversificationCount = data.accountTypes.length;
    const diversificationScore = calculateMetricScore(diversificationCount, {
      excellent: 4,
      good: 3,
      fair: 2
    });

    const metrics: FinancialHealthMetrics = {
      savingsRate: {
        ...savingsRateScore,
        value: data.savingsRate,
        benchmark: 'Target: 20%+'
      },
      budgetControl: {
        ...budgetControlScore,
        value: 100 - expenseVariance,
        benchmark: 'Target: 80% expense ratio'
      },
      emergencyFund: {
        ...emergencyFundScore,
        value: monthsOfExpenses,
        benchmark: 'Target: 6+ months'
      },
      debtToIncome: {
        ...debtToIncomeScore,
        value: debtToIncomeRatio,
        benchmark: 'Target: <10%'
      },
      goalProgress: {
        ...goalProgressScore,
        value: data.goalCompletionRate,
        benchmark: 'Target: 80%+'
      },
      diversification: {
        ...diversificationScore,
        value: diversificationCount,
        benchmark: 'Target: 4+ types'
      }
    };

    // Calculate overall score
    const totalScore = Object.values(metrics).reduce((sum, metric) => sum + metric.score, 0);
    const overallScore = Math.round(totalScore / 6);

    // Determine overall grade and color
    let overallGrade: string;
    let overallColor: string;
    
    if (overallScore >= 9) {
      overallGrade = 'A+';
      overallColor = '#22c55e';
    } else if (overallScore >= 8) {
      overallGrade = 'A';
      overallColor = '#22c55e';
    } else if (overallScore >= 7) {
      overallGrade = 'B+';
      overallColor = '#84cc16';
    } else if (overallScore >= 6) {
      overallGrade = 'B';
      overallColor = '#84cc16';
    } else if (overallScore >= 5) {
      overallGrade = 'C+';
      overallColor = '#eab308';
    } else if (overallScore >= 4) {
      overallGrade = 'C';
      overallColor = '#eab308';
    } else {
      overallGrade = 'D';
      overallColor = '#f97316';
    }

    // Generate insights
    const strengths: string[] = [];
    const improvements: string[] = [];
    const recommendations: string[] = [];

    // Identify strengths (scores >= 8)
    Object.entries(metrics).forEach(([key, metric]) => {
      if (metric.score >= 8) {
        strengths.push(`${metric.label} ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      } else if (metric.score <= 6) {
        improvements.push(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
      }
    });

    // Generate specific recommendations
    if (metrics.savingsRate.score <= 6) {
      recommendations.push('Increase your savings rate by automating transfers to savings accounts');
    }
    if (metrics.emergencyFund.score <= 6) {
      recommendations.push('Build emergency fund to cover 6 months of expenses');
    }
    if (metrics.goalProgress.score <= 6) {
      recommendations.push('Set specific, measurable financial goals with deadlines');
    }
    if (metrics.diversification.score <= 6) {
      recommendations.push('Diversify across multiple account types (savings, checking, investment, retirement)');
    }
    if (metrics.debtToIncome.score <= 6) {
      recommendations.push('Focus on reducing monthly debt payments through acceleration or consolidation');
    }
    if (metrics.budgetControl.score <= 6) {
      recommendations.push('Create and stick to a detailed monthly budget to control expenses');
    }

    // Default recommendations if none specific
    if (recommendations.length === 0) {
      recommendations.push('Continue maintaining your excellent financial habits');
      recommendations.push('Consider advanced strategies like tax optimization and investment diversification');
    }

    return {
      overallScore,
      overallGrade,
      overallColor,
      metrics,
      recommendations,
      strengths,
      improvements,
      trend: 'stable' // Would need historical data to determine actual trend
    };

  } catch (error) {
    console.error('Financial health analysis error:', error);
    
    // Return fallback analysis
    const fallbackMetrics: FinancialHealthMetrics = {
      savingsRate: { score: 5, label: 'Fair', color: '#eab308', value: 10, benchmark: 'Target: 20%+' },
      budgetControl: { score: 6, label: 'Fair', color: '#eab308', value: 75, benchmark: 'Target: 80% expense ratio' },
      emergencyFund: { score: 4, label: 'Needs Improvement', color: '#f97316', value: 2, benchmark: 'Target: 6+ months' },
      debtToIncome: { score: 7, label: 'Good', color: '#84cc16', value: 15, benchmark: 'Target: <10%' },
      goalProgress: { score: 5, label: 'Fair', color: '#eab308', value: 40, benchmark: 'Target: 80%+' },
      diversification: { score: 6, label: 'Fair', color: '#eab308', value: 2, benchmark: 'Target: 4+ types' }
    };

    return {
      overallScore: 5,
      overallGrade: 'C+',
      overallColor: '#eab308',
      metrics: fallbackMetrics,
      recommendations: [
        'Focus on building an emergency fund',
        'Increase your savings rate through automated transfers',
        'Set specific financial goals and track progress'
      ],
      strengths: ['Maintaining basic financial stability'],
      improvements: ['emergency fund', 'savings rate', 'goal setting'],
      trend: 'stable'
    };
  }
}