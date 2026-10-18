import { or } from '@prisma/orm-postgres/orm-client';
import { config } from '../config/env.js';
import { db } from '../prisma/db.js';
import { parseInstant, type InstantRange } from '../utils/dates.js';
import { parseCsv } from '../utils/csv.js';
import { badRequest, HttpError, notFound } from '../utils/errors.js';
import { parseDto } from '../middleware/validate.middleware.js';
import { balanceEffect, negate, type TransactionType } from '../utils/money.js';
import { CreateTransactionDto, type UpdateTransactionDto } from '../validation/dtos.js';

type TxContext = Parameters<Parameters<typeof db.transaction>[0]>[0];

interface LedgerEntry {
  accountId: number;
  type: TransactionType;
  amount: string;
}

// ── Building blocks (always called inside a database transaction) ──────────

async function assertAccountOwned(tx: TxContext, userId: number, accountId: number) {
  const account = await tx.orm.public.Account.select('id').where({ id: accountId, userId }).first();
  if (!account) throw notFound('Account not found');
}

async function assertCategoryUsable(
  tx: TxContext,
  userId: number,
  categoryId: number,
  type: TransactionType,
) {
  const category = await tx.orm.public.Category.select('id', 'type')
    .where({ id: categoryId, userId })
    .first();
  if (!category) throw notFound('Category not found');
  if (category.type !== type) {
    throw badRequest(`Category is for ${category.type} transactions, but this transaction is ${type}`);
  }
}

/**
 * Adds `delta` to an account balance with `balance = balance + delta`.
 * PostgreSQL does the arithmetic in exact `numeric`, and the UPDATE takes a row
 * lock, so concurrent requests are applied one after another instead of
 * overwriting each other (no "lost update").
 */
async function adjustBalance(tx: TxContext, userId: number, accountId: number, delta: string) {
  const plan = db.raw.sql`
    UPDATE "account"
       SET "balance" = "balance" + ${delta}::numeric,
           "updatedAt" = now()
     WHERE "id" = ${accountId} AND "userId" = ${userId}
    RETURNING "id"`
    .returnsRow({ id: 'pg/int4@1' })
    .build();
  const rows = await tx.query(plan);
  if (rows.length !== 1) throw notFound('Account not found');
}

/**
 * Applies balance changes in ascending account-id order. Two requests that
 * touch the same pair of accounts therefore always lock them in the same
 * order, which prevents database deadlocks.
 */
async function applyBalanceChanges(
  tx: TxContext,
  userId: number,
  changes: { accountId: number; delta: string }[],
) {
  const ordered = [...changes].sort((a, b) => a.accountId - b.accountId);
  for (const change of ordered) {
    await adjustBalance(tx, userId, change.accountId, change.delta);
  }
}

/** Reads a transaction and locks its row until our database transaction ends. */
async function lockTransaction(tx: TxContext, userId: number, transactionId: number) {
  const plan = db.raw.sql`
    SELECT "id", "accountId", "categoryId", "amount", "type"
      FROM "transaction"
     WHERE "id" = ${transactionId} AND "userId" = ${userId}
       FOR UPDATE`
    .returnsRow({
      id: 'pg/int4@1',
      accountId: 'pg/int4@1',
      categoryId: { codecId: 'pg/int4@1', nullable: true },
      amount: 'pg/numeric@1',
      type: 'pg/text@1',
    })
    .build();
  const [row] = await tx.query(plan);
  if (!row) throw notFound('Transaction not found');
  if (row.type !== 'income' && row.type !== 'expense') {
    throw new Error(`Unexpected transaction type in database: ${row.type}`);
  }
  return { ...row, type: row.type as TransactionType };
}

function emptyToNull(value: string | null | undefined): string | null {
  return value === undefined || value === null || value === '' ? null : value;
}

// ── Public operations ───────────────────────────────────────────────────────

export async function createTransaction(userId: number, input: CreateTransactionDto) {
  const date = parseInstant(input.date, config.reportingTimeZone);

  return db.transaction(async (tx) => {
    await assertAccountOwned(tx, userId, input.accountId);
    if (input.categoryId) await assertCategoryUsable(tx, userId, input.categoryId, input.type);

    // Balance first, then the row: if inserting the row fails, the whole
    // database transaction (including the balance change) is rolled back.
    await applyBalanceChanges(tx, userId, [
      { accountId: input.accountId, delta: balanceEffect(input.type, input.amount) },
    ]);

    return tx.orm.public.Transaction.create({
      userId,
      accountId: input.accountId,
      categoryId: input.categoryId ?? null,
      amount: input.amount,
      type: input.type,
      description: emptyToNull(input.description),
      merchant: emptyToNull(input.merchant),
      date,
    });
  });
}

export async function updateTransaction(userId: number, transactionId: number, input: UpdateTransactionDto) {
  const date = input.date === undefined ? undefined : parseInstant(input.date, config.reportingTimeZone);

  return db.transaction(async (tx) => {
    const previous = await lockTransaction(tx, userId, transactionId);

    const next: LedgerEntry & { categoryId: number | null } = {
      accountId: input.accountId ?? previous.accountId,
      type: input.type ?? previous.type,
      amount: input.amount ?? previous.amount,
      categoryId: input.categoryId === undefined ? previous.categoryId : input.categoryId,
    };

    if (next.accountId !== previous.accountId) await assertAccountOwned(tx, userId, next.accountId);
    if (next.categoryId !== null) {
      await assertCategoryUsable(tx, userId, next.categoryId, next.type);
    }

    // Undo the old effect, then apply the new one. This one rule covers every
    // edit: amount, income <-> expense, and moving to another account.
    await applyBalanceChanges(tx, userId, [
      { accountId: previous.accountId, delta: negate(balanceEffect(previous.type, previous.amount)) },
      { accountId: next.accountId, delta: balanceEffect(next.type, next.amount) },
    ]);

    const updated = await tx.orm.public.Transaction.where({ id: transactionId, userId }).update({
      accountId: next.accountId,
      categoryId: next.categoryId,
      amount: next.amount,
      type: next.type,
      ...(date === undefined ? {} : { date }),
      ...(input.description === undefined ? {} : { description: emptyToNull(input.description) }),
      ...(input.merchant === undefined ? {} : { merchant: emptyToNull(input.merchant) }),
    });
    if (!updated) throw notFound('Transaction not found');
    return updated;
  });
}

export async function deleteTransaction(userId: number, transactionId: number): Promise<void> {
  await db.transaction(async (tx) => {
    const previous = await lockTransaction(tx, userId, transactionId);
    await applyBalanceChanges(tx, userId, [
      { accountId: previous.accountId, delta: negate(balanceEffect(previous.type, previous.amount)) },
    ]);
    await tx.orm.public.Transaction.where({ id: transactionId, userId }).delete();
  });
}

export async function getTransaction(userId: number, transactionId: number) {
  const transaction = await db.orm.public.Transaction.where({ id: transactionId, userId }).first();
  if (!transaction) throw notFound('Transaction not found');
  return transaction;
}

// ── Listing ─────────────────────────────────────────────────────────────────

export const SORT_FIELDS = ['date', 'amount', 'createdAt'] as const;
export type SortField = (typeof SORT_FIELDS)[number];

export interface TransactionListQuery {
  page: number;
  limit: number;
  type?: TransactionType;
  accountId?: number;
  categoryId?: number;
  range: InstantRange;
  search?: string;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
}

/** Escapes LIKE wildcards so a search for "50%" matches the literal text. */
function likePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function filteredTransactions(userId: number, query: TransactionListQuery) {
  let collection = db.orm.public.Transaction.where({ userId });
  if (query.type) collection = collection.where({ type: query.type });
  if (query.accountId) collection = collection.where({ accountId: query.accountId });
  if (query.categoryId) collection = collection.where({ categoryId: query.categoryId });
  const { from, to } = query.range;
  if (from) collection = collection.where((t) => t.date.gte(from));
  if (to) collection = collection.where((t) => t.date.lt(to));
  if (query.search) {
    const pattern = likePattern(query.search);
    collection = collection.where((t) => or(t.description.ilike(pattern), t.merchant.ilike(pattern)));
  }
  return collection;
}

export async function listTransactions(userId: number, query: TransactionListQuery) {
  const direction = query.sortOrder;
  const offset = (query.page - 1) * query.limit;

  const [{ total }, rows] = await Promise.all([
    filteredTransactions(userId, query).aggregate((a) => ({ total: a.count() })),
    filteredTransactions(userId, query)
      .orderBy([
        (t) => (direction === 'asc' ? t[query.sortBy].asc() : t[query.sortBy].desc()),
        (t) => (direction === 'asc' ? t.id.asc() : t.id.desc()),
      ])
      .limit(query.limit)
      .offset(offset)
      .include('account', (account) => account.select('id', 'name', 'currency'))
      .include('category', (category) => category.select('id', 'name', 'type'))
      .all(),
  ]);

  return {
    data: rows,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
    },
  };
}

// ── CSV export / import ─────────────────────────────────────────────────────

/** Quotes a CSV cell and neutralises spreadsheet formulas (CSV injection). */
function csvCell(value: string | number | null): string {
  if (value === null) return '';
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const CSV_HEADER = ['date', 'amount', 'type', 'accountId', 'categoryId', 'description', 'merchant'];
const MAX_IMPORT_ROWS = 1000;

export async function exportTransactionsCsv(userId: number): Promise<string> {
  const rows = await db.orm.public.Transaction.where({ userId })
    .orderBy([(t) => t.date.asc(), (t) => t.id.asc()])
    .all();
  const lines = [CSV_HEADER.join(',')];
  for (const row of rows) {
    const cells = [row.date.toString(), row.amount, row.type, row.accountId, row.categoryId];
    lines.push([...cells.map(csvCell), csvCell(row.description), csvCell(row.merchant)].join(','));
  }
  return `${lines.join('\n')}\n`;
}

export interface ImportResult {
  totalRows: number;
  successful: number;
  failed: number;
  errors: string[];
}

/**
 * Imports rows with the same validation and balance logic as the API. Each row
 * is its own database transaction: a bad row is reported and skipped, and it
 * never leaves a half-applied balance behind.
 */
export async function importTransactionsCsv(userId: number, csvText: string): Promise<ImportResult> {
  const rows = parseCsv(csvText);
  if (rows.length < 2) throw badRequest('CSV must contain a header row and at least one data row');

  const header = rows[0].map((name) => name.trim());
  for (const required of ['date', 'amount', 'type', 'accountId']) {
    if (!header.includes(required)) throw badRequest(`CSV is missing the "${required}" column`);
  }
  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw badRequest(`CSV can contain at most ${MAX_IMPORT_ROWS} rows per import`);
  }

  const result: ImportResult = { totalRows: dataRows.length, successful: 0, failed: 0, errors: [] };
  for (const [index, cells] of dataRows.entries()) {
    const lineNumber = index + 2;
    const record: Record<string, unknown> = {};
    header.forEach((column, i) => {
      if (!CSV_HEADER.includes(column)) return;
      const value = (cells[i] ?? '').trim();
      if (value === '') return;
      record[column] = column === 'accountId' || column === 'categoryId' ? Number(value) : value;
    });
    try {
      const input = await parseDto(CreateTransactionDto, record);
      await createTransaction(userId, input);
      result.successful++;
    } catch (error) {
      result.failed++;
      const message = error instanceof HttpError ? error.message : 'Unexpected error';
      const details =
        error instanceof HttpError && Array.isArray(error.details) ? `: ${error.details.join('; ')}` : '';
      result.errors.push(`Row ${lineNumber}: ${message}${details}`);
    }
  }
  return result;
}
