import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateAccountDto) {
    return this.prisma.client.orm.public.Account.create({
      userId,
      name: dto.name,
      type: dto.type,
      balance: dto.balance,
      currency: dto.currency,
    });
  }

  async findAll(userId: number) {
    return this.prisma.client.orm.public.Account.where({ userId }).all();
  }

  async findOne(userId: number, accountId: number) {
    const account = await this.prisma.client.orm.public.Account.where({
      id: accountId,
      userId,
    }).first();

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }
  async update(userId: number, accountId: number, dto: UpdateAccountDto) {
    // Verify ownership first
    await this.findOne(userId, accountId);

    return this.prisma.client.orm.public.Account.where({
      id: accountId,
      userId,
    }).update({
      name: dto.name,
      type: dto.type,
      balance: dto.balance,
      currency: dto.currency,
    });
  }

  async remove(userId: number, accountId: number) {
    // Verify ownership first
    await this.findOne(userId, accountId);

    return this.prisma.client.orm.public.Account.where({
      id: accountId,
      userId,
    }).delete();
  }
}
