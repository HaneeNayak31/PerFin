import type { Request, Response } from 'express';
import { currentUserId } from '../middleware/auth.middleware.js';
import * as aiService from '../services/ai.service.js';
import { parseDateRangeQuery } from '../utils/pagination.js';

export async function categorize(req: Request, res: Response) {
  res.json(await aiService.suggestCategory(currentUserId(req), req.body));
}

/** Defaults to the current month when no startDate/endDate is given. */
export async function insights(req: Request, res: Response) {
  const range = parseDateRangeQuery(req.query);
  const period = range.from || range.to ? range : aiService.currentMonthRange();
  res.json(await aiService.getInsights(currentUserId(req), period));
}

export async function chat(req: Request, res: Response) {
  res.json(await aiService.chat(currentUserId(req), req.body.query));
}
