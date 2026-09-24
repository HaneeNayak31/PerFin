import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async categorizeTransaction(merchant: string, description: string) {
    const apiKey = process.env.AI_API_KEY;
    
    if (!apiKey) {
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

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
      const prompt = `Categorize this transaction. Merchant: ${merchant}, Description: ${description}. 
Respond ONLY with a JSON object in this format: {"category": "category name", "confidence": 0.99, "reason": "brief reason"}. 
Keep categories broad like Food, Transport, Utilities, Entertainment, Shopping, Health, Other.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      // Clean up markdown formatting if present
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Categorization Error:", error);
      return {
        category: 'Other',
        confidence: 0.0,
        reason: 'Error connecting to Gemini API.'
      };
    }
  }

  async getInsights(userId: number) {
    const transactions = await this.prisma.client.orm.public.Transaction.where({ userId, type: 'expense' }).all();
    const totalSpent = transactions.reduce((acc, t) => acc + Number(t.amount), 0);
    
    if (!process.env.AI_API_KEY) {
      return [
        `You have spent a total of ₹${totalSpent} recently.`,
        'Your spending on Food seems to be the largest this month.',
        'Consider reviewing your active budgets to stay on track.'
      ];
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
      
      // Creating a summary to feed the prompt
      const expenseSummary = transactions.slice(0, 50).map(t => `${t.merchant}: ₹${t.amount}`).join('\n');
      
      const prompt = `You are a financial advisor. I have spent a total of ₹${totalSpent} recently. 
Here are some of my expenses:
${expenseSummary}

Provide exactly 3 concise, insightful sentences about my spending habits and advice. Return them as a JSON array of strings: ["insight 1", "insight 2", "insight 3"]`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Insights Error:", error);
      return ['Error generating insights with Gemini API.'];
    }
  }

  async chat(userId: number, query: string) {
    const queryLower = query.toLowerCase();
    
    // Fallback for hardcoded commands just in case
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

    if (!process.env.AI_API_KEY) {
      return "I am your AI Finance Agent. Please configure AI_API_KEY for full natural language processing, or ask me simple questions about your balance or spending.";
    }

    try {
      const accounts = await this.prisma.client.orm.public.Account.where({ userId }).all();
      const transactions = await this.prisma.client.orm.public.Transaction.where({ userId }).all();
      
      const totalBalance = accounts.reduce((acc, a) => acc + Number(a.balance), 0);
      const totalSpent = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);

      const genAI = new GoogleGenerativeAI(process.env.AI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `You are an AI Personal Finance Assistant for PerFin.
Context about the user:
- Total Balance: ₹${totalBalance}
- Total Expenses: ₹${totalSpent}
- Number of Accounts: ${accounts.length}

User Query: "${query}"

Respond directly and helpfully in a conversational tone. Keep it concise.`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error("Gemini Chat Error:", error);
      return "I encountered an error trying to process your request.";
    }
  }
}
