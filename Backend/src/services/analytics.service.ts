import { config } from '../config/env.js';
import { db } from '../prisma/db.js';
import { sqlBounds, type InstantRange } from '../utils/dates.js';

/**
 * All totals are computed by PostgreSQL with exact `numeric` arithmetic and
 * returned as decimal strings (e.g. "1250.50"). Nothing is summed in JS.
 */

export interface Overview {
  totalIncome: string;
  totalExpenses: string;
  /** Income minus expenses for the selected period (net cash flow). */
  savings: string;
  /** Sum of all account balances right now (not limited by the period). */
  currentBalance: string;
  numberOfTransactions: number;
}

export async function getOverview(userId: number, range: InstantRange): Promise<Overview> {
  const { from, to } = sqlBounds(range);
  const totalsPlan = db.raw.sql`
    SELECT COALESCE(SUM("amount") FILTER (WHERE "type" = 'income'), 0)  AS "totalIncome",
           COALESCE(SUM("amount") FILTER (WHERE "type" = 'expense'), 0) AS "totalExpenses",
           COALESCE(SUM(CASE WHEN "type" = 'income' THEN "amount" ELSE -"amount" END), 0) AS "savings",
           COUNT(*)::int4 AS "numberOfTransactions"
      FROM "transaction"
     WHERE "userId" = ${userId}
       AND "date" >= ${from}::timestamptz AND "date" < ${to}::timestamptz`
    .returnsRow({
      totalIncome: 'pg/numeric@1',
      totalExpenses: 'pg/numeric@1',
      savings: 'pg/numeric@1',
      numberOfTransactions: 'pg/int4@1',
    })
    .build();
  const balancePlan = db.raw.sql`
    SELECT COALESCE(SUM("balance"), 0) AS "currentBalance" FROM "account" WHERE "userId" = ${userId}`
    .returnsRow({ currentBalance: 'pg/numeric@1' })
    .build();

  const runtime = db.runtime();
  const [[totals], [balance]] = await Promise.all([runtime.query(totalsPlan), runtime.query(balancePlan)]);
  return {
    totalIncome: totals.totalIncome,
    totalExpenses: totals.totalExpenses,
    savings: totals.savings,
    currentBalance: balance.currentBalance,
    numberOfTransactions: totals.numberOfTransactions,
  };
}

export interface MonthlyRow {
  month: string; // YYYY-MM in the reporting time zone
  income: string;
  expense: string;
  net: string;
}

export async function getMonthly(userId: number, range: InstantRange): Promise<MonthlyRow[]> {
  const { from, to } = sqlBounds(range);
  const timeZone = config.reportingTimeZone;
  // A transaction at 2026-10-31T20:00Z is 1 November in Asia/Kolkata, so
  // months are cut in the reporting time zone, not in UTC.
  const plan = db.raw.sql`
    SELECT to_char(date_trunc('month', "date" AT TIME ZONE ${timeZone}), 'YYYY-MM') AS "month",
           COALESCE(SUM("amount") FILTER (WHERE "type" = 'income'), 0)  AS "income",
           COALESCE(SUM("amount") FILTER (WHERE "type" = 'expense'), 0) AS "expense",
           SUM(CASE WHEN "type" = 'income' THEN "amount" ELSE -"amount" END) AS "net"
      FROM "transaction"
     WHERE "userId" = ${userId}
       AND "date" >= ${from}::timestamptz AND "date" < ${to}::timestamptz
     GROUP BY 1
     ORDER BY 1`
    .returnsRow({ month: 'pg/text@1', income: 'pg/numeric@1', expense: 'pg/numeric@1', net: 'pg/numeric@1' })
    .build();
  return db.runtime().query(plan);
}

export interface CategoryRow {
  categoryId: number | null;
  category: string;
  amount: string;
}

export async function getCategoryBreakdown(userId: number, range: InstantRange): Promise<CategoryRow[]> {
  const { from, to } = sqlBounds(range);
  const plan = db.raw.sql`
    SELECT t."categoryId" AS "categoryId",
           COALESCE(c."name", 'Uncategorized') AS "category",
           SUM(t."amount") AS "amount"
      FROM "transaction" t
      LEFT JOIN "category" c ON c."id" = t."categoryId"
     WHERE t."userId" = ${userId}
       AND t."type" = 'expense'
       AND t."date" >= ${from}::timestamptz AND t."date" < ${to}::timestamptz
     GROUP BY t."categoryId", c."name"
     ORDER BY SUM(t."amount") DESC, 2 ASC`
    .returnsRow({
      categoryId: { codecId: 'pg/int4@1', nullable: true },
      category: 'pg/text@1',
      amount: 'pg/numeric@1',
    })
    .build();
  return db.runtime().query(plan);
}
