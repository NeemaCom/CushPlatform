import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface FinancialMoodData {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  recentTransactions: Array<{
    amount: number;
    type: string;
    category: string;
    date: string;
  }>;
  financialGoals: Array<{
    title: string;
    progress: number;
    targetAmount: number;
    currentAmount: number;
  }>;
}

export interface MoodAnalysis {
  moodScore: number; // 1-10 scale
  moodLabel: string; // e.g., "Optimistic", "Cautious", "Stressed"
  moodColor: string; // Hex color for UI
  mainFactors: string[];
  motivationTips: string[];
  actionableSteps: string[];
  celebrationPoints: string[];
  warningSignals: string[];
}

export async function analyzeFinancialMood(data: FinancialMoodData): Promise<MoodAnalysis> {
  try {
    const systemPrompt = `You are a financial wellness expert and mood analyzer. 
Analyze the user's financial data and provide a comprehensive mood assessment.
Consider spending patterns, savings rate, goal progress, and recent financial behavior.
Provide practical, encouraging, and actionable insights.

Respond with JSON in this exact format:
{
  "moodScore": number (1-10, where 1 is very stressed, 10 is very confident),
  "moodLabel": string (one word: "Stressed", "Cautious", "Stable", "Optimistic", "Confident"),
  "moodColor": string (hex color: red for low scores, yellow for medium, green for high),
  "mainFactors": [3-4 key factors affecting mood],
  "motivationTips": [3-4 encouraging statements],
  "actionableSteps": [3-4 specific actions to improve financial wellness],
  "celebrationPoints": [2-3 positive achievements to celebrate],
  "warningSignals": [1-2 areas needing attention, or empty array if none]
}`;

    const userPrompt = `Financial Data Analysis:
- Total Balance: $${data.totalBalance.toLocaleString()}
- Monthly Income: $${data.monthlyIncome.toLocaleString()}
- Monthly Expenses: $${data.monthlyExpenses.toLocaleString()}
- Savings Rate: ${data.savingsRate}%
- Recent Transactions: ${data.recentTransactions.length} transactions
- Top Spending Categories: ${getTopCategories(data.recentTransactions)}
- Financial Goals Progress: ${data.financialGoals.map(g => `${g.title}: ${g.progress}%`).join(', ')}
- Average Goal Progress: ${calculateAverageGoalProgress(data.financialGoals)}%

Analyze this financial profile and provide a mood assessment with personalized insights.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            moodScore: { type: "number" },
            moodLabel: { type: "string" },
            moodColor: { type: "string" },
            mainFactors: { type: "array", items: { type: "string" } },
            motivationTips: { type: "array", items: { type: "string" } },
            actionableSteps: { type: "array", items: { type: "string" } },
            celebrationPoints: { type: "array", items: { type: "string" } },
            warningSignals: { type: "array", items: { type: "string" } }
          },
          required: ["moodScore", "moodLabel", "moodColor", "mainFactors", "motivationTips", "actionableSteps", "celebrationPoints", "warningSignals"]
        }
      },
      contents: userPrompt
    });

    const rawJson = response.text;
    if (rawJson) {
      const analysis: MoodAnalysis = JSON.parse(rawJson);
      return analysis;
    } else {
      throw new Error("Empty response from AI model");
    }
  } catch (error) {
    console.error('Financial mood analysis error:', error);
    // Fallback mood analysis based on basic metrics
    return generateFallbackMoodAnalysis(data);
  }
}

function getTopCategories(transactions: any[]): string {
  const categorySpending = transactions.reduce((acc, t) => {
    if (t.type === 'expense') {
      acc[t.category] = (acc[t.category] || 0) + Math.abs(t.amount);
    }
    return acc;
  }, {});
  
  return Object.entries(categorySpending)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3)
    .map(([category]) => category)
    .join(', ');
}

function calculateAverageGoalProgress(goals: any[]): number {
  if (goals.length === 0) return 0;
  const totalProgress = goals.reduce((sum, goal) => sum + goal.progress, 0);
  return Math.round(totalProgress / goals.length);
}

function generateFallbackMoodAnalysis(data: FinancialMoodData): MoodAnalysis {
  const savingsRate = data.savingsRate;
  const netIncome = data.monthlyIncome - data.monthlyExpenses;
  const avgGoalProgress = calculateAverageGoalProgress(data.financialGoals);
  
  let moodScore = 5;
  let moodLabel = "Stable";
  let moodColor = "#F59E0B"; // yellow
  
  // Calculate mood score based on key metrics
  if (savingsRate >= 20) moodScore += 2;
  else if (savingsRate >= 10) moodScore += 1;
  else if (savingsRate < 5) moodScore -= 2;
  
  if (netIncome > 0) moodScore += 1;
  else moodScore -= 2;
  
  if (avgGoalProgress >= 75) moodScore += 1;
  else if (avgGoalProgress < 25) moodScore -= 1;
  
  moodScore = Math.max(1, Math.min(10, moodScore));
  
  if (moodScore >= 8) {
    moodLabel = "Confident";
    moodColor = "#10B981"; // green
  } else if (moodScore >= 6) {
    moodLabel = "Optimistic";
    moodColor = "#10B981"; // green
  } else if (moodScore >= 4) {
    moodLabel = "Cautious";
    moodColor = "#F59E0B"; // yellow
  } else {
    moodLabel = "Stressed";
    moodColor = "#EF4444"; // red
  }
  
  return {
    moodScore,
    moodLabel,
    moodColor,
    mainFactors: [
      `${savingsRate}% savings rate ${savingsRate >= 10 ? 'shows good discipline' : 'could be improved'}`,
      `Monthly net income of $${netIncome.toLocaleString()} ${netIncome > 0 ? 'provides stability' : 'indicates overspending'}`,
      `${avgGoalProgress}% average goal progress ${avgGoalProgress >= 50 ? 'shows commitment' : 'needs attention'}`
    ],
    motivationTips: [
      "Every small step towards your financial goals counts",
      "Building wealth is a marathon, not a sprint",
      "Your financial awareness puts you ahead of most people"
    ],
    actionableSteps: [
      "Review your largest expense categories this month",
      "Set up automatic transfers to your savings account",
      "Track your progress weekly to stay motivated"
    ],
    celebrationPoints: [
      savingsRate > 0 ? "You're actively saving money each month" : "You're tracking your finances",
      data.financialGoals.length > 0 ? "You have clear financial goals set" : "You're monitoring your spending"
    ],
    warningSignals: netIncome < 0 ? ["Monthly expenses exceed income"] : []
  };
}