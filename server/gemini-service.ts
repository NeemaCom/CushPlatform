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
  hasActiveSubscription?: boolean;
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
    const isPremium = context.hasActiveSubscription || false;
    const systemPrompt = this.buildSystemPrompt(context, isPremium);
    const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}`;

    try {
      const result = await this.model.generateContent(fullPrompt);
      const response = await result.response;
      let text = response.text();

      // Apply word limit for free users
      if (!isPremium) {
        const words = text.split(/\s+/).filter(word => word.length > 0);
        if (words.length > 50) {
          text = words.slice(0, 50).join(' ') + '...';
        }
        text += '\n\n💎 Upgrade to Imisi Premium for unlimited responses and advanced financial guidance! Only $9.99/month.';
      }

      const parsedResponse = this.parseResponse(text);
      
      // Add premium upgrade action for free users
      if (!isPremium) {
        parsedResponse.actions = [
          {
            type: 'navigate',
            label: '💎 Upgrade to Premium',
            data: '/subscribe'
          },
          ...(parsedResponse.actions || [])
        ];
      }

      return parsedResponse;
    } catch (error: any) {
      console.error('Gemini API error:', error);
      
      // Handle rate limit errors with helpful fallback
      if (error.status === 429) {
        const { user, currentBalance } = context;
        const fallbackMessage = isPremium 
          ? `Hi ${user.firstName}! I'm experiencing high demand. Balance: $${currentBalance.toFixed(2)}. Please try again in a moment.`
          : `Hi ${user.firstName}! Balance: $${currentBalance.toFixed(2)}. Upgrade to Premium for priority access and unlimited responses!`;
        
        return {
          message: fallbackMessage,
          suggestions: isPremium ? ['Try again', 'Check balance', 'View transactions'] : ['Upgrade to Premium', 'Basic budgeting', 'Immigration info'],
          actions: isPremium ? [] : [{
            type: 'navigate',
            label: 'Upgrade to Premium',
            data: '/subscribe'
          }]
        };
      }
      
      throw new Error('Unable to generate AI response');
    }
  }



  private buildSystemPrompt(context: UserContext, isPremium: boolean = false): string {
    const { user, accounts, recentTransactions, balanceHistory, currentBalance, monthlyIncome, monthlyExpenses } = context;
    
    const wordLimit = isPremium ? '' : 'Keep responses under 50 words.';
    const premiumPrompt = isPremium ? 'Provide detailed, comprehensive responses.' : 'After each response, suggest upgrading to Imisi Premium.';
    
    return `You are Imisi 2.0, AI assistant for Cush financial platform. ${wordLimit}

User: ${user.firstName} ${user.lastName} (${isPremium ? 'Premium' : 'Free'})
Balance: $${currentBalance.toFixed(2)}
Monthly Income: $${monthlyIncome.toFixed(2)}
Monthly Expenses: $${monthlyExpenses.toFixed(2)}

Recent Transactions:
${recentTransactions.slice(0, 3).map(t => `${t.type}: $${t.amount} - ${t.description}`).join('\n')}

You help with financial analysis, budgeting, and immigration guidance for Nigerians moving to Canada.

${premiumPrompt} Be helpful and personalized.`;
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

    // Ensure response includes premium upgrade prompt
    let finalMessage = text;
    if (!text.includes('Premium') && !text.includes('upgrade')) {
      finalMessage += '\n\n💎 Upgrade to Imisi Premium for detailed analysis and unlimited assistance.';
    }

    // Always include premium upgrade action
    actions.unshift({
      type: 'navigate',
      label: 'Upgrade to Premium',
      data: { route: '/subscribe' }
    });

    return {
      message: finalMessage,
      suggestions: ['Upgrade to Premium', 'Ask another question', 'Immigration help'],
      actions: actions
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