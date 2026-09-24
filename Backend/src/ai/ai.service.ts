import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async categorizeTransaction(merchant: string, description: string) {
    const apiKey = process.env.AI_API_KEY;
    
    // In a real implementation we would call OpenAI/Anthropic/Gemini here.
    // For this portfolio piece, if no API key is provided, we simulate the structured response.
    if (!apiKey) {
      // Mocked AI logic based on keywords
      const text = `${merchant} ${description}`.toLowerCase();
      let category = 'Other';
      if (text.includes('zomato') || text.includes('food') || text.includes('restaurant')) category = 'Food';
      else if (text.includes('uber') || text.includes('transport') || text.includes('taxi')) category = 'Transport';
      
      return {
        category,
        confidence: 0.94,
        reason: 'Simulated AI categorization (No AI_API_KEY provided).'
      };
    }

    // Pseudo-code for real API call
    return {
      category: 'Food',
      confidence: 0.99,
      reason: 'AI service integrated successfully.'
    };
  }

  async getInsights(userId: number) {
    // Gather summarized financial data
    const transactions = await this.prisma.client.orm.public.Transaction.where({ userId, type: 'expense' }).all();
    const totalSpent = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
    
    if (!process.env.AI_API_KEY) {
      return [
        `You have spent a total of ₹${totalSpent} recently.`,
        'Your spending on Food seems to be the largest this month.',
        'Consider reviewing your active budgets to stay on track.'
      ];
    }

    // Call real LLM with summarized data
    return [
      'Real AI insight 1',
      'Real AI insight 2'
    ];
  }

  async chat(userId: number, query: string) {
    // LLM Agent tool simulation
    // A real implementation would parse the query using an LLM configured with tools.
    // E.g. getAccounts(), getTransactions(), getBudgets()
    
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('how much did i spend')) {
      const transactions = await this.prisma.client.orm.public.Transaction.where({ userId, type: 'expense' }).all();
      const total = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
      return `You have spent ₹${total} in total.`;
    }
    
    if (queryLower.includes('balance')) {
      const accounts = await this.prisma.client.orm.public.Account.where({ userId }).all();
      const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance), 0);
      return `Your total current balance across all accounts is ₹${totalBalance}.`;
    }

    return "I am your AI Finance Agent. Please configure AI_API_KEY for full natural language processing, or ask me simple questions about your balance or spending.";
  }
}
