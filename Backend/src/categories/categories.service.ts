import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateCategoryDto) {
    const existing = await this.prisma.client.orm.public.Category.where({
      userId,
      name: dto.name,
    }).first();

    if (existing) {
      throw new ConflictException('Category with this name already exists');
    }

    return this.prisma.client.orm.public.Category.create({
      userId,
      name: dto.name,
      type: dto.type as any,
    });
  }

  async findAll(userId: number) {
    return this.prisma.client.orm.public.Category.where({ userId }).all();
  }

  async findOne(userId: number, id: number) {
    const category = await this.prisma.client.orm.public.Category.where({ id, userId }).first();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async update(userId: number, id: number, dto: UpdateCategoryDto) {
    await this.findOne(userId, id);

    if (dto.name) {
      const existing = await this.prisma.client.orm.public.Category.where({
        userId,
        name: dto.name,
      }).first();

      if (existing && existing.id !== id) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    return this.prisma.client.orm.public.Category.where({ id, userId }).update({
      name: dto.name,
      type: dto.type as any,
    });
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);

    // Check if referenced by transactions or budgets
    const transactionCount = await this.prisma.client.orm.public.Transaction.where({ categoryId: id }).count();
    if (Number(transactionCount) > 0) {
      throw new ConflictException('Cannot delete category referenced by transactions');
    }

    const budgetCount = await this.prisma.client.orm.public.Budget.where({ categoryId: id }).count();
    if (Number(budgetCount) > 0) {
      throw new ConflictException('Cannot delete category referenced by budgets');
    }

    return this.prisma.client.orm.public.Category.where({ id, userId }).delete();
  }
}
