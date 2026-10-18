import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/auth.middleware.js';
import * as analyticsService from '../services/analytics.service.js';
import { parseDateRangeQuery } from '../utils/pagination.js';

// Every endpoint accepts optional ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD (inclusive).

export async function overview(req: Request, res: Response) {
  res.json(await analyticsService.getOverview(currentUserId(req), parseDateRangeQuery(req.query)));
}

export async function monthly(req: Request, res: Response) {
  res.json(await analyticsService.getMonthly(currentUserId(req), parseDateRangeQuery(req.query)));
}

export async function categories(req: Request, res: Response) {
  res.json(await analyticsService.getCategoryBreakdown(currentUserId(req), parseDateRangeQuery(req.query)));
}
