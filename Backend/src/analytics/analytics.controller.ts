import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service.js';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  getOverview(@Req() req: any) {
    return this.analyticsService.getOverview(req.user.userId);
  }

  @Get('monthly')
  getMonthly(@Req() req: any) {
    return this.analyticsService.getMonthly(req.user.userId);
  }

  @Get('categories')
  getCategories(@Req() req: any) {
    return this.analyticsService.getCategories(req.user.userId);
  }

  @Get('cashflow')
  getCashflow(@Req() req: any) {
    return this.analyticsService.getCashflow(req.user.userId);
  }
}
