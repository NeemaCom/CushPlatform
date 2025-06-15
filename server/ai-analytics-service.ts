import { GoogleGenerativeAI } from '@google/generative-ai';
import { Transaction, Account, SafeUser } from '@shared/schema';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export interface FinancialPattern {
  id: string;
  type: 'spending_spike' | 'recurring_expense' | 'income_drop' | 'savings_opportunity' | 'budget_overrun';
  category: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  amount: number;
  frequency: string;
  detectedAt: Date;
  suggestions: string[];
}

export interface PersonalizedRecommendation {
  id: string;
  type: 'save_money' | 'optimize_spending' | 'increase_income' | 'budget_adjustment' | 'investment_opportunity';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  potentialSavings: number;
  actionSteps: string[];
  category: string;
  timeframe: string;
}

export interface AIAnalyticsData {
  patterns: FinancialPattern[];
  recommendations: PersonalizedRecommendation[];
  insights: {
    spendingHabits: string[];
    incomeStability: string;
    savingsProgress: string;
    budgetPerformance: string;
    financialHealth: {
      score: number;
      factors: string[];
    };
  };
  predictions: {
    nextMonthSpending: number;
    savingsGoalProgress: string;
    budgetRisks: string[];
  };
}

export class AIFinancialAnalytics {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  async analyzeUserFinances(
    user: SafeUser,
    transactions: Transaction[],
    accounts: Account[]
  ): Promise<AIAnalyticsData> {
    // Calculate key financial metrics
    const metrics = this.calculateFinancialMetrics(transactions, accounts);
    
    // Generate AI insights using Gemini
    const aiInsights = await this.generateAIInsights(user, metrics, transactions);
    
    // Detect spending patterns
    const patterns = this.detectSpendingPatterns(transactions);
    
    // Generate personalized recommendations
    const recommendations = await this.generatePersonalizedRecommendations(user, metrics, patterns);
    
    // Create financial predictions
    const predictions = this.generatePredictions(transactions, patterns);

    return {
      patterns,
      recommendations,
      insights: aiInsights,
      predictions
    };
  }

  private calculateFinancialMetrics(transactions: Transaction[], accounts: Account[]) {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

    // Filter transactions by time periods
    const thisMonthTransactions = transactions.filter(t => new Date(t.createdAt) >= thisMonth);
    const lastMonthTransactions = transactions.filter(t => 
      new Date(t.createdAt) >= lastMonth && new Date(t.createdAt) < thisMonth
    );
    const last3MonthsTransactions = transactions.filter(t => new Date(t.createdAt) >= threeMonthsAgo);

    // Calculate totals
    const totalBalance = accounts.reduce((sum, account) => sum + parseFloat(account.balance), 0);
    
    const thisMonthIncome = thisMonthTransactions
      .filter(t => parseFloat(t.amount) > 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const thisMonthExpenses = Math.abs(thisMonthTransactions
      .filter(t => parseFloat(t.amount) < 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0));

    const lastMonthIncome = lastMonthTransactions
      .filter(t => parseFloat(t.amount) > 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const lastMonthExpenses = Math.abs(lastMonthTransactions
      .filter(t => parseFloat(t.amount) < 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0));

    // Calculate averages and trends
    const avgMonthlyIncome = last3MonthsTransactions
      .filter(t => parseFloat(t.amount) > 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0) / 3;

    const avgMonthlyExpenses = Math.abs(last3MonthsTransactions
      .filter(t => parseFloat(t.amount) < 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)) / 3;

    // Category analysis
    const categorySpending = transactions
      .filter(t => parseFloat(t.amount) < 0)
      .reduce((acc, t) => {
        const category = t.category || 'Other';
        acc[category] = (acc[category] || 0) + Math.abs(parseFloat(t.amount));
        return acc;
      }, {} as Record<string, number>);

    const topCategories = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return {
      totalBalance,
      thisMonthIncome,
      thisMonthExpenses,
      lastMonthIncome,
      lastMonthExpenses,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      categorySpending,
      topCategories,
      savingsRate: totalBalance / (avgMonthlyIncome || 1),
      expenseGrowth: ((thisMonthExpenses - lastMonthExpenses) / (lastMonthExpenses || 1)) * 100,
      incomeGrowth: ((thisMonthIncome - lastMonthIncome) / (lastMonthIncome || 1)) * 100
    };
  }

  private async generateAIInsights(user: SafeUser, metrics: any, transactions: Transaction[]) {
    const prompt = `
    Analyze the following financial data for ${user.firstName} and provide insights:
    
    Financial Summary:
    - Total Balance: $${metrics.totalBalance.toFixed(2)}
    - This Month Income: $${metrics.thisMonthIncome.toFixed(2)}
    - This Month Expenses: $${metrics.thisMonthExpenses.toFixed(2)}
    - Average Monthly Income: $${metrics.avgMonthlyIncome.toFixed(2)}
    - Average Monthly Expenses: $${metrics.avgMonthlyExpenses.toFixed(2)}
    - Income Growth: ${metrics.incomeGrowth.toFixed(1)}%
    - Expense Growth: ${metrics.expenseGrowth.toFixed(1)}%
    - Top Spending Categories: ${metrics.topCategories.map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`).join(', ')}
    
    Please provide:
    1. 3-4 key spending habits observations
    2. Income stability assessment (one sentence)
    3. Savings progress evaluation (one sentence)
    4. Budget performance summary (one sentence)
    5. Financial health score (0-100) with 3 key factors
    
    Format as JSON with keys: spendingHabits, incomeStability, savingsProgress, budgetPerformance, financialHealth
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse AI response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('AI insights generation error:', error);
    }

    // Fallback insights based on data analysis
    return {
      spendingHabits: [
        `Highest spending category: ${metrics.topCategories[0]?.[0] || 'Unknown'}`,
        metrics.expenseGrowth > 10 ? 'Expenses increasing significantly' : 'Spending relatively stable',
        metrics.avgMonthlyExpenses > metrics.avgMonthlyIncome ? 'Spending exceeds income' : 'Living within means'
      ],
      incomeStability: metrics.incomeGrowth >= 0 ? 'Income showing positive trend' : 'Income declining, needs attention',
      savingsProgress: metrics.savingsRate > 0.2 ? 'Good savings rate maintained' : 'Savings rate could be improved',
      budgetPerformance: metrics.thisMonthExpenses <= metrics.avgMonthlyExpenses ? 'On track with budget' : 'Over budget this month',
      financialHealth: {
        score: Math.max(0, Math.min(100, 
          50 + (metrics.savingsRate * 100) + (metrics.incomeGrowth / 2) - (metrics.expenseGrowth / 2)
        )),
        factors: [
          'Savings rate',
          'Income stability',
          'Expense control'
        ]
      }
    };
  }

  private detectSpendingPatterns(transactions: Transaction[]): FinancialPattern[] {
    const patterns: FinancialPattern[] = [];
    const now = new Date();

    // Detect spending spikes
    const dailySpending = transactions
      .filter(t => parseFloat(t.amount) < 0)
      .reduce((acc, t) => {
        const date = new Date(t.createdAt).toDateString();
        acc[date] = (acc[date] || 0) + Math.abs(parseFloat(t.amount));
        return acc;
      }, {} as Record<string, number>);

    const avgDailySpending = Object.values(dailySpending).reduce((a, b) => a + b, 0) / Object.values(dailySpending).length;
    const spendingSpikes = Object.entries(dailySpending).filter(([, amount]) => amount > avgDailySpending * 2);

    spendingSpikes.forEach(([date, amount], index) => {
      patterns.push({
        id: `spike_${index}`,
        type: 'spending_spike',
        category: 'General',
        description: `Unusual spending spike detected on ${date}`,
        impact: amount > avgDailySpending * 3 ? 'high' : 'medium',
        amount,
        frequency: 'One-time',
        detectedAt: new Date(),
        suggestions: ['Review large purchases', 'Consider if this was planned', 'Adjust budget if necessary']
      });
    });

    // Detect recurring expenses
    const recurringExpenses = this.findRecurringTransactions(transactions);
    recurringExpenses.forEach((expense, index) => {
      patterns.push({
        id: `recurring_${index}`,
        type: 'recurring_expense',
        category: expense.category || 'Other',
        description: `Regular ${expense.category || 'expense'} of approximately $${expense.amount.toFixed(2)}`,
        impact: expense.amount > 100 ? 'high' : expense.amount > 50 ? 'medium' : 'low',
        amount: expense.amount,
        frequency: expense.frequency,
        detectedAt: new Date(),
        suggestions: ['Review if still needed', 'Look for better rates', 'Consider alternatives']
      });
    });

    return patterns;
  }

  private findRecurringTransactions(transactions: Transaction[]) {
    // Group transactions by similar amounts and descriptions
    const groups = transactions
      .filter(t => parseFloat(t.amount) < 0)
      .reduce((acc, t) => {
        const amount = Math.abs(parseFloat(t.amount));
        const key = `${t.description}_${Math.round(amount)}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(t);
        return acc;
      }, {} as Record<string, Transaction[]>);

    // Find groups with multiple occurrences
    return Object.entries(groups)
      .filter(([, transactions]) => transactions.length >= 2)
      .map(([key, transactions]) => ({
        description: transactions[0].description,
        category: transactions[0].category,
        amount: Math.abs(parseFloat(transactions[0].amount)),
        frequency: transactions.length >= 3 ? 'Monthly' : 'Occasional',
        count: transactions.length
      }));
  }

  private async generatePersonalizedRecommendations(
    user: SafeUser,
    metrics: any,
    patterns: FinancialPattern[]
  ): Promise<PersonalizedRecommendation[]> {
    const recommendations: PersonalizedRecommendation[] = [];

    // Budget-based recommendations
    if (metrics.expenseGrowth > 15) {
      recommendations.push({
        id: 'reduce_spending',
        type: 'save_money',
        title: 'Reduce Monthly Spending',
        description: 'Your expenses have increased significantly. Consider cutting back on non-essential purchases.',
        priority: 'high',
        potentialSavings: metrics.thisMonthExpenses * 0.1,
        actionSteps: [
          'Review your top spending categories',
          'Identify non-essential expenses',
          'Set spending limits for each category',
          'Track daily expenses'
        ],
        category: 'Budgeting',
        timeframe: 'This month'
      });
    }

    // Savings recommendations
    if (metrics.savingsRate < 0.1) {
      recommendations.push({
        id: 'increase_savings',
        type: 'save_money',
        title: 'Boost Your Savings Rate',
        description: 'Aim to save at least 10-20% of your income for better financial security.',
        priority: 'high',
        potentialSavings: metrics.avgMonthlyIncome * 0.1,
        actionSteps: [
          'Set up automatic transfers to savings',
          'Create a separate emergency fund',
          'Look for areas to cut spending',
          'Consider increasing your income'
        ],
        category: 'Savings',
        timeframe: 'Next 3 months'
      });
    }

    // Category-specific recommendations
    const topCategory = metrics.topCategories[0];
    if (topCategory && topCategory[1] > metrics.avgMonthlyIncome * 0.3) {
      recommendations.push({
        id: 'optimize_category',
        type: 'optimize_spending',
        title: `Optimize ${topCategory[0]} Spending`,
        description: `You're spending a significant portion of income on ${topCategory[0]}. Look for optimization opportunities.`,
        priority: 'medium',
        potentialSavings: topCategory[1] * 0.15,
        actionSteps: [
          'Compare prices and alternatives',
          'Look for discounts or bulk buying',
          'Consider if all purchases are necessary',
          'Set a monthly limit for this category'
        ],
        category: topCategory[0],
        timeframe: 'Next month'
      });
    }

    // Income recommendations
    if (metrics.incomeGrowth < 0) {
      recommendations.push({
        id: 'income_stability',
        type: 'increase_income',
        title: 'Stabilize Income Sources',
        description: 'Your income has decreased. Consider diversifying or finding additional income streams.',
        priority: 'high',
        potentialSavings: 0,
        actionSteps: [
          'Analyze income decline causes',
          'Explore side income opportunities',
          'Update your skills for better opportunities',
          'Network for new opportunities'
        ],
        category: 'Income',
        timeframe: 'Next 6 months'
      });
    }

    return recommendations;
  }

  private generatePredictions(transactions: Transaction[], patterns: FinancialPattern[]) {
    const recentTransactions = transactions
      .filter(t => new Date(t.createdAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

    const avgDailySpending = Math.abs(recentTransactions
      .filter(t => parseFloat(t.amount) < 0)
      .reduce((sum, t) => sum + parseFloat(t.amount), 0)) / 30;

    const nextMonthSpending = avgDailySpending * 30;

    const budgetRisks = [];
    if (patterns.some(p => p.type === 'spending_spike')) {
      budgetRisks.push('Irregular large purchases detected');
    }
    if (avgDailySpending > 0) {
      budgetRisks.push('Spending trend increasing');
    }

    return {
      nextMonthSpending,
      savingsGoalProgress: 'Based on current trends, you may save less than planned',
      budgetRisks
    };
  }
}

export const aiAnalyticsService = new AIFinancialAnalytics();