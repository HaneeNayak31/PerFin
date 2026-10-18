import type { Request, Response } from 'express';
import { config } from '../config/env.js';
import { currentUserId } from '../middleware/auth.middleware.js';
import * as budgetService from '../services/budget.service.js';
import { currentYearMonth } from '../utils/dates.js';
import { parseId, parseYearMonthQuery } from '../utils/pagination.js';

export async function list(req: Request, res: Response) {
  res.json(await budgetService.listBudgets(currentUserId(req)));
}

/** GET /budgets/current?year=2026&month=10 (defaults to this month). */
export async function current(req: Request, res: Response) {
  const now = currentYearMonth(config.reportingTimeZone);
  const { year = now.year, month = now.month } = parseYearMonthQuery(req.query);
  res.json(await budgetService.getBudgetProgress(currentUserId(req), year, month));
}

export async function getOne(req: Request, res: Response) {
  res.json(await budgetService.getBudget(currentUserId(req), parseId(req.params.id)));
}

export async function create(req: Request, res: Response) {
  res.status(201).json(await budgetService.createBudget(currentUserId(req), req.body));
}

export async function update(req: Request, res: Response) {
  res.json(await budgetService.updateBudget(currentUserId(req), parseId(req.params.id), req.body));
}

export async function remove(req: Request, res: Response) {
  await budgetService.deleteBudget(currentUserId(req), parseId(req.params.id));
  res.status(204).end();
}
