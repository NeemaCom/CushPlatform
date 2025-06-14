import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SafeUser, Account, Transaction, BalanceHistory } from '@shared/schema';

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export interface UserContext {
  user: SafeUser;
  accounts: Account[];
  recentTransactions: Transaction[];
  balanceHistory: BalanceHistory[];
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  actions?: Array<{
    type: 'navigate' | 'form' | 'external';
    label: string;
    data: any;
  }>;
}

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  async generateResponse(userMessage: string, context: UserContext): Promise<ChatResponse> {
    const systemPrompt = this.buildSystemPrompt(context);
    const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();

      return this.parseResponse(text);
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      // Handle rate limit errors with helpful fallback
      if (error.status === 429) {
        const { user, currentBalance } = context;
        return {
          message: `Hello ${user.firstName}! I'm Imisi 2.0, your AI assistant for Cush. I can help you with financial management, budgeting advice, and immigration guidance. With your current balance of $${currentBalance.toFixed(2)}, I can provide personalized recommendations. How can I assist you today?`,
          suggestions: ['Check my budget', 'Immigration help', 'Financial advice', 'Platform features']
        };
      }
      
      throw new Error('Unable to generate AI response');
    }
  }



  private buildSystemPrompt(context: UserContext): string {
    const { user, accounts, recentTransactions, balanceHistory, currentBalance, monthlyIncome, monthlyExpenses } = context;
    
    return `You are Imisi 2.0, AI assistant for Cush financial platform.

User: ${user.firstName} ${user.lastName} (${user.nationality || 'N/A'})
Balance: $${currentBalance.toFixed(2)} | Monthly: +$${monthlyIncome.toFixed(2)} -$${monthlyExpenses.toFixed(2)}

Help with finances, budgeting, immigration guidance. Be concise and actionable.`;
  }

  private parseResponse(text: string): ChatResponse {
    // Extract suggestions and actions from the response
    const suggestions: string[] = [];
    const actions: Array<{ type: 'navigate' | 'form' | 'external'; label: string; data: any }> = [];

    // Look for common action patterns in the response
    if (text.toLowerCase().includes('budget') || text.toLowerCase().includes('spending')) {
      actions.push({
        type: 'navigate',
        label: 'View Budget Tracker',
        data: { route: '/budget' }
      });
    }

    if (text.toLowerCase().includes('transaction') || text.toLowerCase().includes('payment')) {
      actions.push({
        type: 'navigate',
        label: 'View Transactions',
        data: { route: '/transactions' }
      });
    }

    if (text.toLowerCase().includes('immigration') || text.toLowerCase().includes('visa')) {
      actions.push({
        type: 'external',
        label: 'Immigration Resources',
        data: { url: 'https://www.uscis.gov' }
      });
    }

    // Extract suggestions (lines that start with bullet points or numbers)
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) {
        suggestions.push(line.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '').trim());
      }
    });

    return {
      message: text,
      suggestions: suggestions.length > 0 ? suggestions.slice(0, 3) : undefined,
      actions: actions.length > 0 ? actions : undefined
    };
  }

  async generateProactivePrompt(context: UserContext): Promise<string | null> {
    const { user, currentBalance, monthlyIncome, monthlyExpenses, recentTransactions } = context;

    // Generate proactive prompts based on user context
    const prompts = [];

    // Low balance warning
    if (currentBalance < 100) {
      prompts.push(`Hi ${user.firstName}! I noticed your balance is getting low. Would you like some tips on managing expenses?`);
    }

    // High expense month
    if (monthlyExpenses > monthlyIncome * 0.9) {
      prompts.push(`Your expenses are quite high this month. I can help you create a budget plan to save more.`);
    }

    // No recent transactions
    if (recentTransactions.length === 0) {
      prompts.push(`Ready to start tracking your finances? I can help you add your first transaction.`);
    }

    // Immigration status check
    if (user.nationality && user.nationality !== 'US') {
      prompts.push(`Need help with immigration documentation? I can guide you through the process.`);
    }

    return prompts.length > 0 ? prompts[Math.floor(Math.random() * prompts.length)] : null;
  }
}

export const geminiService = new GeminiService();