import { config } from '../config/env.js';
import { db } from '../prisma/db.js';
import { monthRange } from '../utils/dates.js';
import { badRequest, conflict, isUniqueViolation, notFound } from '../utils/errors.js';
import type { CreateBudgetDto, UpdateBudgetDto } from '../validation/dtos.js';

async function assertExpenseCategory(userId: number, categoryId: number) {
  const category = await db.orm.public.Category.select('id', 'type').where({ id: categoryId, userId }).first();
  if (!category) throw notFound('Category not found');
  if (category.type !== 'expense') throw badRequest('Budgets can only be set for expense categories');
}

export async function listBudgets(userId: number) {
  return db.orm.public.Budget.where({ userId })
    .orderBy([(b) => b.year.desc(), (b) => b.month.desc(), (b) => b.id.asc()])
    .include('category', (category) => category.select('id', 'name', 'type'))
    .all();
}

export async function getBudget(userId: number, budgetId: number) {
  const budget = await db.orm.public.Budget.where({ id: budgetId, userId }).first();
  if (!budget) throw notFound('Budget not found');
  return budget;
}

const DUPLICATE_MESSAGE = 'A budget for this category and month already exists';

export async function createBudget(userId: number, input: CreateBudgetDto) {
  await assertExpenseCategory(userId, input.categoryId);
  try {
    return await db.orm.public.Budget.create({
      userId,
      categoryId: input.categoryId,
      amount: input.amount,
      month: input.month,
      year: input.year,
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict(DUPLICATE_MESSAGE);
    throw error;
  }
}

export async function updateBudget(userId: number, budgetId: number, input: UpdateBudgetDto) {
  await getBudget(userId, budgetId);
  if (input.categoryId !== undefined) await assertExpenseCategory(userId, input.categoryId);

  const changes: Partial<UpdateBudgetDto> = {};
  if (input.categoryId !== undefined) changes.categoryId = input.categoryId;
  if (input.amount !== undefined) changes.amount = input.amount;
  if (input.month !== undefined) changes.month = input.month;
  if (input.year !== undefined) changes.year = input.year;
  if (Object.keys(changes).length === 0) return getBudget(userId, budgetId);

  try {
    return await db.orm.public.Budget.where({ id: budgetId, userId }).update(changes);
  } catch (error) {
    if (isUniqueViolation(error)) throw conflict(DUPLICATE_MESSAGE);
    throw error;
  }
}

export async function deleteBudget(userId: number, budgetId: number): Promise<void> {
  await getBudget(userId, budgetId);
  await db.orm.public.Budget.where({ id: budgetId, userId }).delete();
}

export interface BudgetProgress {
  id: number;
  categoryId: number;
  categoryName: string;
  amount: string;
  month: number;
  year: number;
  spent: string;
  remaining: string;
  /** For display only (e.g. progress bars); money values stay exact strings. */
  percentageUsed: number;
}

/** Budgets for one month with spending computed by the database. */
export async function getBudgetProgress(userId: number, year: number, month: number): Promise<BudgetProgress[]> {
  const { from, to } = monthRange(year, month, config.reportingTimeZone);
  const plan = db.raw.sql`
    SELECT b."id", b."categoryId", c."name" AS "categoryName", b."amount", b."month", b."year",
           COALESCE(s."spent", 0) AS "spent",
           b."amount" - COALESCE(s."spent", 0) AS "remaining",
           ROUND(COALESCE(s."spent", 0) * 100 / NULLIF(b."amount", 0), 2)::text AS "percentageUsed"
      FROM "budget" b
      JOIN "category" c ON c."id" = b."categoryId"
      LEFT JOIN (
            SELECT "categoryId", SUM("amount") AS "spent"
              FROM "transaction"
             WHERE "userId" = ${userId} AND "type" = 'expense'
               AND "date" >= ${from.toString()}::timestamptz AND "date" < ${to.toString()}::timestamptz
             GROUP BY "categoryId"
           ) s ON s."categoryId" = b."categoryId"
     WHERE b."userId" = ${userId} AND b."month" = ${month} AND b."year" = ${year}
     ORDER BY c."name"`
    .returnsRow({
      id: 'pg/int4@1',
      categoryId: 'pg/int4@1',
      categoryName: 'pg/text@1',
      amount: 'pg/numeric@1',
      month: 'pg/int4@1',
      year: 'pg/int4@1',
      spent: 'pg/numeric@1',
      remaining: 'pg/numeric@1',
      percentageUsed: { codecId: 'pg/text@1', nullable: true },
    })
    .build();
  const rows = await db.runtime().query(plan);
  return rows.map((row) => ({ ...row, percentageUsed: Number(row.percentageUsed ?? 0) }));
}
