import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(userId: number) {
    const accounts = await this.prisma.client.orm.public.Account.where({ userId }).all();
    const currentBalance = accounts.reduce((sum: number, acc: any) => sum + Number(acc.balance), 0);

    const transactions = await this.prisma.client.orm.public.Transaction.where({ userId }).all();
    const totalIncome = transactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const totalExpenses = transactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    
    const savings = totalIncome - totalExpenses;

    return {
      totalIncome: totalIncome.toString(),
      totalExpenses: totalExpenses.toString(),
      currentBalance: currentBalance.toString(),
      savings: savings.toString(),
      numberOfTransactions: transactions.length,
    };
  }

  async getMonthly(userId: number) {
    // Basic aggregation: could be done in SQL, but for simplicity let's do it in JS
    const transactions = await this.prisma.client.orm.public.Transaction.where({ userId }).all();
    
    const monthlyData: Record<string, { income: number; expense: number }> = {};
    
    for (const t of transactions) {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) {
        monthlyData[key] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') monthlyData[key].income += Number(t.amount);
      if (t.type === 'expense') monthlyData[key].expense += Number(t.amount);
    }

    return Object.entries(monthlyData).map(([month, data]) => ({
      month,
      income: data.income.toString(),
      expense: data.expense.toString(),
    })).sort((a, b) => a.month.localeCompare(b.month));
  }

  async getCategories(userId: number) {
    const transactions = await this.prisma.client.orm.public.Transaction.where({ userId, type: 'expense' }).all();
    const categories = await this.prisma.client.orm.public.Category.where({ userId }).all();
    const categoryMap = new Map(categories.map((c: any) => [c.id, c.name]));
    
    const catData: Record<string, number> = {};
    
    for (const t of transactions) {
      if (t.categoryId) {
        const catName = categoryMap.get(t.categoryId) || 'Unknown';
        if (!catData[catName]) catData[catName] = 0;
        catData[catName] += Number(t.amount);
      }
    }

    return Object.entries(catData).map(([category, amount]) => ({
      category,
      amount: amount.toString(),
    })).sort((a, b) => Number(b.amount) - Number(a.amount));
  }

  async getCashflow(userId: number) {
    // Similar to monthly but perhaps more granular or just a different format
    return this.getMonthly(userId);
  }
}
