import type { Request } from 'express';
import { config } from '../config/env.js';
import { SORT_FIELDS, type SortField, type TransactionListQuery } from '../services/transaction.service.js';
import { dateRange, type InstantRange } from './dates.js';
import { badRequest } from './errors.js';
import { TRANSACTION_TYPES, type TransactionType } from './money.js';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

type Query = Request['query'];

function readString(query: Query, key: string): string | undefined {
  const value = query[key];
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string') throw badRequest(`${key} must be a single value`);
  return value;
}

function readInt(query: Query, key: string, min: number, max: number): number | undefined {
  const value = readString(query, key);
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw badRequest(`${key} must be a whole number`);
  const parsed = Number(value);
  if (parsed < min || parsed > max) throw badRequest(`${key} must be between ${min} and ${max}`);
  return parsed;
}

/** Parses a positive integer route parameter such as /transactions/:id. */
export function parseId(value: string | string[] | undefined, name = 'id'): number {
  if (typeof value !== 'string' || !/^[1-9]\d{0,9}$/.test(value) || Number(value) > 2147483647) {
    throw badRequest(`${name} must be a positive integer`);
  }
  return Number(value);
}

export function parseDateRangeQuery(query: Query): InstantRange {
  return dateRange(readString(query, 'startDate'), readString(query, 'endDate'), config.reportingTimeZone);
}

export function parseYearMonthQuery(query: Query): { year?: number; month?: number } {
  return { year: readInt(query, 'year', 2000, 2100), month: readInt(query, 'month', 1, 12) };
}

export function parseTransactionListQuery(query: Query): TransactionListQuery {
  const type = readString(query, 'type');
  if (type !== undefined && !TRANSACTION_TYPES.includes(type as TransactionType)) {
    throw badRequest('type must be income or expense');
  }
  const sortBy = readString(query, 'sortBy') ?? 'date';
  if (!SORT_FIELDS.includes(sortBy as SortField)) {
    throw badRequest(`sortBy must be one of: ${SORT_FIELDS.join(', ')}`);
  }
  const sortOrder = (readString(query, 'sortOrder') ?? 'desc').toLowerCase();
  if (sortOrder !== 'asc' && sortOrder !== 'desc') throw badRequest('sortOrder must be asc or desc');

  const search = readString(query, 'search')?.trim();
  if (search && search.length > 100) throw badRequest('search must be at most 100 characters');

  return {
    page: readInt(query, 'page', 1, 1_000_000) ?? 1,
    limit: readInt(query, 'limit', 1, MAX_PAGE_SIZE) ?? DEFAULT_PAGE_SIZE,
    type: type as TransactionType | undefined,
    accountId: readInt(query, 'accountId', 1, 2147483647),
    categoryId: readInt(query, 'categoryId', 1, 2147483647),
    range: parseDateRangeQuery(query),
    search: search || undefined,
    sortBy: sortBy as SortField,
    sortOrder,
  };
}
