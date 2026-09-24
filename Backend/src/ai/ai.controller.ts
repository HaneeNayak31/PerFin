import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AiService } from './ai.service.js';

@Controller('ai')
@UseGuards(AuthGuard('jwt'))
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('categorize')
  categorize(@Body() body: { merchant: string; description: string }) {
    return this.aiService.categorizeTransaction(body.merchant, body.description);
  }

  @Get('insights')
  getInsights(@Req() req: any) {
    return this.aiService.getInsights(req.user.userId);
  }

  @Post('chat')
  chat(@Req() req: any, @Body() body: { query: string }) {
    return this.aiService.chat(req.user.userId, body.query);
  }
}
