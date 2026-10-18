import { config } from '../config/env.js';
import { db } from '../prisma/db.js';
import { currentYearMonth, monthRange, type InstantRange } from '../utils/dates.js';
import { badRequest } from '../utils/errors.js';
import type { TransactionType } from '../utils/money.js';
import { getCategoryBreakdown, getOverview, type CategoryRow, type Overview } from './analytics.service.js';
import { AiUnavailableError, generateText, isAiConfigured } from './gemini.client.js';

/**
 * Design rules for the AI layer:
 *  - The database computes every number. Gemini only phrases or classifies.
 *  - Only aggregates (and, for categorisation, one merchant/description) are
 *    sent to Gemini, never raw transaction lists or account names.
 *  - Model output is parsed and validated before use; category suggestions
 *    must match one of the user's own categories.
 *  - When Gemini is not configured, slow, or returns junk, the response says
 *    so (`source: 'unavailable'`) instead of inventing an answer.
 */

const UNAVAILABLE_MESSAGE = 'AI features are unavailable right now (AI_API_KEY not configured or the provider failed).';

function unavailableMessage(error: unknown): string {
  if (error instanceof AiUnavailableError && error.reason === 'not_configured') {
    return 'AI features are disabled because AI_API_KEY is not configured.';
  }
  if (error instanceof AiUnavailableError && error.reason === 'timeout') {
    return 'The AI provider took too long to respond. Please try again.';
  }
  return UNAVAILABLE_MESSAGE;
}

/** Parses model output that should be JSON, tolerating ```json fences. */
export function parseModelJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch {
    return undefined;
  }
}

// ── Categorisation ──────────────────────────────────────────────────────────

export interface CategorySuggestion {
  source: 'gemini' | 'unavailable' | 'none';
  suggestion: { categoryId: number; categoryName: string; type: string } | null;
  reason: string | null;
  message?: string;
}

export async function suggestCategory(
  userId: number,
  input: { merchant?: string; description?: string; type?: TransactionType },
): Promise<CategorySuggestion> {
  if (!input.merchant && !input.description) {
    throw badRequest('Provide a merchant or a description to categorise');
  }

  let categoryQuery = db.orm.public.Category.select('id', 'name', 'type').where({ userId });
  if (input.type) categoryQuery = categoryQuery.where({ type: input.type });
  const categories = await categoryQuery.orderBy((c) => c.name.asc()).all();
  if (categories.length === 0) {
    return { source: 'none', suggestion: null, reason: null, message: 'Create a category first.' };
  }

  const prompt = [
    'You categorise personal finance transactions.',
    'Choose the single best category from this list, or null if none fits:',
    JSON.stringify(categories.map((c) => c.name)),
    `Merchant: ${JSON.stringify(input.merchant ?? '')}`,
    `Description: ${JSON.stringify(input.description ?? '')}`,
    'Reply with JSON only: {"categoryName": string | null, "reason": string (max 20 words)}.',
  ].join('\n');

  let raw: string;
  try {
    raw = await generateText(prompt, { json: true });
  } catch (error) {
    return { source: 'unavailable', suggestion: null, reason: null, message: unavailableMessage(error) };
  }

  const parsed = parseModelJson(raw);
  if (!parsed || typeof parsed !== 'object' || !('categoryName' in parsed)) {
    return { source: 'unavailable', suggestion: null, reason: null, message: 'The AI returned an invalid response.' };
  }
  const { categoryName, reason } = parsed as { categoryName: unknown; reason?: unknown };
  const cleanReason = typeof reason === 'string' ? reason.slice(0, 300) : null;

  if (categoryName === null) {
    return { source: 'gemini', suggestion: null, reason: cleanReason, message: 'No existing category fits.' };
  }
  // Never trust the model's choice: it must be one of this user's categories.
  const match =
    typeof categoryName === 'string'
      ? categories.find((c) => c.name.toLowerCase() === categoryName.trim().toLowerCase())
      : undefined;
  if (!match) {
    return {
      source: 'gemini',
      suggestion: null,
      reason: null,
      message: 'The AI suggested a category that does not exist, so it was ignored.',
    };
  }
  return {
    source: 'gemini',
    suggestion: { categoryId: match.id, categoryName: match.name, type: match.type },
    reason: cleanReason,
  };
}

// ── Insights ────────────────────────────────────────────────────────────────

interface FinancialFacts {
  period: { from: string | null; to: string | null; timeZone: string };
  overview: Overview;
  topExpenseCategories: CategoryRow[];
}

async function collectFacts(userId: number, range: InstantRange): Promise<FinancialFacts> {
  const [overview, categories] = await Promise.all([
    getOverview(userId, range),
    getCategoryBreakdown(userId, range),
  ]);
  return {
    period: {
      from: range.from?.toString() ?? null,
      to: range.to?.toString() ?? null,
      timeZone: config.reportingTimeZone,
    },
    overview,
    topExpenseCategories: categories.slice(0, 5),
  };
}

export function currentMonthRange(): InstantRange {
  const { year, month } = currentYearMonth(config.reportingTimeZone);
  return monthRange(year, month, config.reportingTimeZone);
}

export interface InsightsResponse {
  source: 'gemini' | 'unavailable' | 'calculated';
  /** Exact figures computed by the database. Always present. */
  facts: FinancialFacts;
  /** AI-written suggestions based only on `facts`. May be empty. */
  insights: string[];
  message?: string;
}

function isInsightList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 5 &&
    value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 400)
  );
}

export async function getInsights(userId: number, range: InstantRange): Promise<InsightsResponse> {
  const facts = await collectFacts(userId, range);
  if (facts.overview.numberOfTransactions === 0) {
    return { source: 'calculated', facts, insights: [], message: 'No transactions in this period yet.' };
  }

  const prompt = [
    'You are a cautious personal finance assistant.',
    'Using ONLY the figures in the JSON below, write up to 3 short, practical observations or suggestions.',
    'Do not invent numbers, merchants, or categories that are not in the data. Amounts are in the user\'s account currency.',
    JSON.stringify({
      period: facts.period,
      totalIncome: facts.overview.totalIncome,
      totalExpenses: facts.overview.totalExpenses,
      netCashFlow: facts.overview.savings,
      transactionCount: facts.overview.numberOfTransactions,
      topExpenseCategories: facts.topExpenseCategories.map(({ category, amount }) => ({ category, amount })),
    }),
    'Reply with a JSON array of strings only.',
  ].join('\n');

  try {
    const parsed = parseModelJson(await generateText(prompt, { json: true }));
    if (!isInsightList(parsed)) {
      return { source: 'unavailable', facts, insights: [], message: 'The AI returned an invalid response.' };
    }
    return { source: 'gemini', facts, insights: parsed.map((item) => item.trim()) };
  } catch (error) {
    return { source: 'unavailable', facts, insights: [], message: unavailableMessage(error) };
  }
}

// ── Chat ────────────────────────────────────────────────────────────────────

export interface ChatResponse {
  source: 'gemini' | 'calculated';
  reply: string;
}

function factsSummary(facts: FinancialFacts): string {
  const { overview } = facts;
  const top = facts.topExpenseCategories[0];
  return [
    `This month: income ${overview.totalIncome}, expenses ${overview.totalExpenses}, net ${overview.savings} across ${overview.numberOfTransactions} transactions.`,
    `Total balance across all accounts: ${overview.currentBalance}.`,
    top ? `Largest expense category this month: ${top.category} (${top.amount}).` : 'No expenses recorded this month.',
  ].join(' ');
}

export async function chat(userId: number, query: string): Promise<ChatResponse> {
  const facts = await collectFacts(userId, currentMonthRange());

  if (!isAiConfigured()) {
    return {
      source: 'calculated',
      reply: `${unavailableMessage(new AiUnavailableError('not_configured'))} Here are your calculated figures: ${factsSummary(facts)}`,
    };
  }

  const prompt = [
    'You are PerFin\'s finance assistant. You can only see the summary below for the current month.',
    'Answer the user\'s question using ONLY these figures. If the question needs data that is not here',
    '(individual transactions, other months, forecasts, investment advice), say you cannot see that yet.',
    'Keep the answer under 120 words. Do not make up numbers.',
    `Summary: ${JSON.stringify({
      period: facts.period,
      ...facts.overview,
      topExpenseCategories: facts.topExpenseCategories.map(({ category, amount }) => ({ category, amount })),
    })}`,
    `User question: ${JSON.stringify(query)}`,
  ].join('\n');

  try {
    const reply = (await generateText(prompt, { json: false })).trim();
    if (!reply) throw new AiUnavailableError('provider_error');
    return { source: 'gemini', reply: reply.slice(0, 2000) };
  } catch (error) {
    return { source: 'calculated', reply: `${unavailableMessage(error)} Here are your calculated figures: ${factsSummary(facts)}` };
  }
}
