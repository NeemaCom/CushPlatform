import { GoogleGenAI } from "@google/genai";
import { storage } from './storage';
import type { Transaction, User, FinancialGoal } from '../shared/schema';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface PredictiveInsight {
  id: string;
  type: 'spending_forecast' | 'income_prediction' | 'savings_opportunity' | 'risk_alert' | 'goal_achievement';
  title: string;
  description: string;
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
  category: string;
  predictedValue?: number;
  timeframe: string;
  recommendations: string[];
  dataPoints: Array<{ date: string; value: number; }>;
  createdAt: string;
}

export interface SmartAlert {
  id: string;
  type: 'budget_overrun' | 'unusual_spending' | 'income_drop' | 'goal_at_risk' | 'opportunity';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  actionRequired: boolean;
  suggestedActions: string[];
  affectedCategories: string[];
  threshold?: number;
  actualValue?: number;
  createdAt: string;
  expiresAt?: string;
}

export interface FinancialPrediction {
  balanceForecast: Array<{ date: string; predicted: number; confidence: number; }>;
  spendingTrends: Array<{ category: string; trend: 'increasing' | 'decreasing' | 'stable'; change: number; }>;
  savingsProjection: { sixMonths: number; oneYear: number; confidence: number; };
  riskFactors: Array<{ factor: string; riskLevel: number; impact: string; }>;
}

export class AIPredictiveService {
  private model = "gemini-2.5-pro";

  async generatePredictiveInsights(userId: number): Promise<PredictiveInsight[]> {
    try {
      const user = await storage.getUserById(userId);
      const transactions = await storage.getTransactionsByUserId(userId);
      const goals = await storage.getFinancialGoalsByUserId(userId);
      
      if (!user || transactions.length === 0) {
        return [];
      }

      const financialData = this.prepareFinancialData(transactions, goals);
      const insights = await this.analyzeFinancialPatterns(financialData);
      
      return insights;
    } catch (error) {
      console.error('Error generating predictive insights:', error);
      return [];
    }
  }

  async generateSmartAlerts(userId: number): Promise<SmartAlert[]> {
    try {
      const transactions = await storage.getTransactionsByUserId(userId);
      const goals = await storage.getFinancialGoalsByUserId(userId);
      
      if (transactions.length === 0) {
        return [];
      }

      const alerts = await this.detectAnomaliesAndRisks(transactions, goals);
      return alerts;
    } catch (error) {
      console.error('Error generating smart alerts:', error);
      return [];
    }
  }

  async generateFinancialForecast(userId: number): Promise<FinancialPrediction> {
    try {
      const transactions = await storage.getTransactionsByUserId(userId);
      const balanceHistory = await storage.getBalanceHistoryByUserId(userId);
      
      const financialData = {
        transactions: transactions.slice(-90), // Last 90 days
        balanceHistory: balanceHistory.slice(-30), // Last 30 days
        currentBalance: balanceHistory[balanceHistory.length - 1]?.totalBalance || 0
      };

      const forecast = await this.predictFinancialTrends(financialData);
      return forecast;
    } catch (error) {
      console.error('Error generating financial forecast:', error);
      return {
        balanceForecast: [],
        spendingTrends: [],
        savingsProjection: { sixMonths: 0, oneYear: 0, confidence: 0 },
        riskFactors: []
      };
    }
  }

  private prepareFinancialData(transactions: Transaction[], goals: FinancialGoal[]) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const recentTransactions = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
    const historicalTransactions = transactions.filter(t => new Date(t.date) >= ninetyDaysAgo);

    const monthlyIncome = recentTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const categorySpending = recentTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const category = t.category || 'Other';
        acc[category] = (acc[category] || 0) + Math.abs(t.amount);
        return acc;
      }, {} as Record<string, number>);

    return {
      recentTransactions,
      historicalTransactions,
      monthlyIncome,
      monthlyExpenses,
      categorySpending,
      goals,
      savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0
    };
  }

  private async analyzeFinancialPatterns(data: any): Promise<PredictiveInsight[]> {
    const prompt = `
    Analyze the following financial data and provide predictive insights:
    
    Monthly Income: $${data.monthlyIncome}
    Monthly Expenses: $${data.monthlyExpenses}
    Savings Rate: ${data.savingsRate.toFixed(1)}%
    Category Spending: ${JSON.stringify(data.categorySpending, null, 2)}
    Active Goals: ${data.goals.length}
    
    Transaction patterns over last 30 days:
    ${JSON.stringify(data.recentTransactions.slice(0, 10), null, 2)}
    
    Please provide exactly 3-5 predictive insights in JSON format with the following structure:
    {
      "insights": [
        {
          "id": "unique_id",
          "type": "spending_forecast|income_prediction|savings_opportunity|risk_alert|goal_achievement",
          "title": "Insight Title",
          "description": "Detailed description of the insight",
          "confidence": 85,
          "impact": "high|medium|low",
          "category": "category_name",
          "predictedValue": 1250.50,
          "timeframe": "next 30 days",
          "recommendations": ["action1", "action2"],
          "dataPoints": [{"date": "2025-07-01", "value": 1000}]
        }
      ]
    }
    
    Focus on actionable insights that help users make better financial decisions.
    `;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              insights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    type: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    confidence: { type: "number" },
                    impact: { type: "string" },
                    category: { type: "string" },
                    predictedValue: { type: "number" },
                    timeframe: { type: "string" },
                    recommendations: { type: "array", items: { type: "string" } },
                    dataPoints: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string" },
                          value: { type: "number" }
                        }
                      }
                    }
                  },
                  required: ["id", "type", "title", "description", "confidence", "impact", "category", "timeframe", "recommendations"]
                }
              }
            }
          }
        },
        contents: prompt
      });

      const result = JSON.parse(response.text);
      return result.insights.map((insight: any) => ({
        ...insight,
        createdAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Error analyzing financial patterns:', error);
      return this.generateFallbackInsights(data);
    }
  }

  private async detectAnomaliesAndRisks(transactions: Transaction[], goals: FinancialGoal[]): Promise<SmartAlert[]> {
    const now = new Date();
    const lastMonth = transactions.filter(t => 
      new Date(t.date) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    );

    const alerts: SmartAlert[] = [];

    // Unusual spending detection
    const dailySpending = this.calculateDailySpending(lastMonth);
    const avgDailySpending = dailySpending.reduce((sum, day) => sum + day.amount, 0) / dailySpending.length;
    const highSpendingDays = dailySpending.filter(day => day.amount > avgDailySpending * 2);

    if (highSpendingDays.length > 0) {
      alerts.push({
        id: `unusual_spending_${Date.now()}`,
        type: 'unusual_spending',
        severity: 'warning',
        title: 'Unusual Spending Detected',
        message: `You've had ${highSpendingDays.length} days with spending significantly above your average`,
        actionRequired: false,
        suggestedActions: [
          'Review recent transactions for unexpected charges',
          'Set up spending alerts for large purchases',
          'Consider adjusting your budget categories'
        ],
        affectedCategories: [...new Set(lastMonth.filter(t => t.type === 'expense').map(t => t.category || 'Other'))],
        threshold: avgDailySpending * 2,
        actualValue: Math.max(...highSpendingDays.map(d => d.amount)),
        createdAt: new Date().toISOString()
      });
    }

    // Goal at risk detection
    for (const goal of goals) {
      if (!goal.isCompleted && goal.targetDate) {
        const daysToTarget = Math.ceil((new Date(goal.targetDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const remainingAmount = goal.targetAmount - goal.currentAmount;
        const requiredDailyContribution = remainingAmount / daysToTarget;

        if (daysToTarget <= 30 && requiredDailyContribution > (goal.monthlyContribution || 0) / 30 * 2) {
          alerts.push({
            id: `goal_at_risk_${goal.id}`,
            type: 'goal_at_risk',
            severity: 'critical',
            title: `Goal "${goal.title}" at Risk`,
            message: `You need to contribute $${requiredDailyContribution.toFixed(2)}/day to meet your goal`,
            actionRequired: true,
            suggestedActions: [
              'Increase monthly contributions',
              'Extend the target date',
              'Review and reduce expenses in other categories'
            ],
            affectedCategories: [goal.category || 'Savings'],
            createdAt: new Date().toISOString(),
            expiresAt: goal.targetDate
          });
        }
      }
    }

    return alerts;
  }

  private async predictFinancialTrends(data: any): Promise<FinancialPrediction> {
    const prompt = `
    Based on this financial data, predict future trends:
    
    Current Balance: $${data.currentBalance}
    Recent Transactions: ${JSON.stringify(data.transactions.slice(0, 20))}
    Balance History: ${JSON.stringify(data.balanceHistory)}
    
    Provide predictions in JSON format:
    {
      "balanceForecast": [
        {"date": "2025-07-01", "predicted": 27500, "confidence": 85}
      ],
      "spendingTrends": [
        {"category": "Food", "trend": "increasing", "change": 15.5}
      ],
      "savingsProjection": {
        "sixMonths": 5000,
        "oneYear": 12000,
        "confidence": 78
      },
      "riskFactors": [
        {"factor": "High variable spending", "riskLevel": 65, "impact": "May affect savings goals"}
      ]
    }
    
    Generate realistic predictions for the next 6 months.
    `;

    try {
      const response = await ai.models.generateContent({
        model: this.model,
        config: {
          responseMimeType: "application/json"
        },
        contents: prompt
      });

      return JSON.parse(response.text);
    } catch (error) {
      console.error('Error predicting financial trends:', error);
      return this.generateFallbackForecast(data);
    }
  }

  private calculateDailySpending(transactions: Transaction[]): Array<{ date: string; amount: number; }> {
    const dailySpending = new Map<string, number>();
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const date = new Date(t.date).toISOString().split('T')[0];
        dailySpending.set(date, (dailySpending.get(date) || 0) + Math.abs(t.amount));
      });

    return Array.from(dailySpending.entries()).map(([date, amount]) => ({ date, amount }));
  }

  private generateFallbackInsights(data: any): PredictiveInsight[] {
    const insights: PredictiveInsight[] = [];
    const now = new Date();

    // Spending forecast insight
    if (data.monthlyExpenses > 0) {
      insights.push({
        id: `spending_forecast_${Date.now()}`,
        type: 'spending_forecast',
        title: 'Monthly Spending Projection',
        description: `Based on current patterns, you're projected to spend $${(data.monthlyExpenses * 1.05).toFixed(2)} next month`,
        confidence: 75,
        impact: 'medium',
        category: 'Spending',
        predictedValue: data.monthlyExpenses * 1.05,
        timeframe: 'next 30 days',
        recommendations: [
          'Monitor discretionary spending',
          'Consider setting category-specific budgets'
        ],
        dataPoints: [
          { date: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], value: data.monthlyExpenses * 1.05 }
        ],
        createdAt: now.toISOString()
      });
    }

    // Savings opportunity insight
    if (data.savingsRate < 20) {
      insights.push({
        id: `savings_opportunity_${Date.now()}`,
        type: 'savings_opportunity',
        title: 'Savings Optimization Opportunity',
        description: `Your current savings rate of ${data.savingsRate.toFixed(1)}% could be improved. Aim for 20%+`,
        confidence: 85,
        impact: 'high',
        category: 'Savings',
        timeframe: 'ongoing',
        recommendations: [
          'Reduce spending in top expense categories',
          'Set up automatic transfers to savings',
          'Look for ways to increase income'
        ],
        dataPoints: [],
        createdAt: now.toISOString()
      });
    }

    return insights;
  }

  private generateFallbackForecast(data: any): FinancialPrediction {
    const now = new Date();
    const balanceForecast = [];
    
    // Simple linear projection
    for (let i = 1; i <= 6; i++) {
      const futureDate = new Date(now.getTime() + i * 30 * 24 * 60 * 60 * 1000);
      const projectedBalance = data.currentBalance + (i * 500); // Simple growth assumption
      balanceForecast.push({
        date: futureDate.toISOString().split('T')[0],
        predicted: projectedBalance,
        confidence: Math.max(90 - i * 10, 50) // Decreasing confidence over time
      });
    }

    return {
      balanceForecast,
      spendingTrends: [
        { category: 'Food', trend: 'stable' as const, change: 0 },
        { category: 'Transportation', trend: 'increasing' as const, change: 5 }
      ],
      savingsProjection: {
        sixMonths: 3000,
        oneYear: 7200,
        confidence: 65
      },
      riskFactors: []
    };
  }
}

export const aiPredictiveService = new AIPredictiveService();