import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateBudgetDto) {
    const category = await this.prisma.client.orm.public.Category.where({
      id: dto.categoryId,
      userId,
    }).first();
    
    if (!category) throw new NotFoundException('Category not found');

    const existing = await this.prisma.client.orm.public.Budget.where({
      userId,
      categoryId: dto.categoryId,
      month: dto.month,
      year: dto.year,
    }).first();

    if (existing) {
      throw new ConflictException('Budget for this category and month/year already exists');
    }

    return this.prisma.client.orm.public.Budget.create({
      userId,
      categoryId: dto.categoryId,
      amount: dto.amount,
      month: dto.month,
      year: dto.year,
    });
  }

  async findAll(userId: number) {
    return this.prisma.client.orm.public.Budget.where({ userId }).all();
  }

  async findOne(userId: number, id: number) {
    const budget = await this.prisma.client.orm.public.Budget.where({ id, userId }).first();
    if (!budget) throw new NotFoundException('Budget not found');
    return budget;
  }

  async update(userId: number, id: number, dto: UpdateBudgetDto) {
    const budget = await this.findOne(userId, id);

    if (dto.categoryId) {
      const category = await this.prisma.client.orm.public.Category.where({
        id: dto.categoryId,
        userId,
      }).first();
      if (!category) throw new NotFoundException('Category not found');
    }

    const checkCategoryId = dto.categoryId || budget.categoryId;
    const checkMonth = dto.month || budget.month;
    const checkYear = dto.year || budget.year;

    if (dto.categoryId || dto.month || dto.year) {
      const existing = await this.prisma.client.orm.public.Budget.where({
        userId,
        categoryId: checkCategoryId,
        month: checkMonth,
        year: checkYear,
      }).first();

      if (existing && existing.id !== id) {
        throw new ConflictException('Budget for this category and month/year already exists');
      }
    }

    return this.prisma.client.orm.public.Budget.where({ id, userId }).update({
      categoryId: dto.categoryId,
      amount: dto.amount,
      month: dto.month,
      year: dto.year,
    });
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);
    return this.prisma.client.orm.public.Budget.where({ id, userId }).delete();
  }

  async findCurrent(userId: number) {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();

    const budgets = await this.prisma.client.orm.public.Budget.where({
      userId,
      month,
      year,
    }).all();

    // Get spending for this month for the user
    // Since Prisma 8 syntax is simplified, we'll fetch transactions in the month and calculate in JS
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const transactions = await this.prisma.client.orm.public.Transaction.where({
      userId,
      type: 'expense',
      date: {
        gte: startDate,
        lte: endDate,
      },
    }).all();

    return budgets.map((budget: any) => {
      const categoryTransactions = transactions.filter((t: any) => t.categoryId === budget.categoryId);
      const spent = categoryTransactions.reduce((acc: number, t: any) => acc + Number(t.amount), 0);
      const budgetAmount = Number(budget.amount);
      const remaining = budgetAmount - spent;
      const percentageUsed = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      return {
        ...budget,
        spent: spent.toString(),
        remaining: remaining.toString(),
        percentageUsed,
      };
    });
  }
}
