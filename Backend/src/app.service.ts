import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getDatabaseStatus() {
    const users = await this.prisma.client.orm.public.User.select('id').all();

    return {
      database: 'connected',
      userCount: users.length,
    };
  }
}
