import { AiUnavailableError } from '../../src/services/gemini.client.js';
import { createAccount, createCategory, createTransaction, resetDatabase, signedInAgent, type Agent } from './helpers.js';

// Gemini is always mocked: tests never need an API key or network access.
const gemini = vi.hoisted(() => ({ generateText: vi.fn(), isAiConfigured: vi.fn(() => true) }));
vi.mock('../../src/services/gemini.client.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/services/gemini.client.js')>()),
  generateText: gemini.generateText,
  isAiConfigured: gemini.isAiConfigured,
}));

let agent: Agent;
let foodId: number;

beforeEach(async () => {
  await resetDatabase();
  gemini.generateText.mockReset();
  gemini.isAiConfigured.mockReturnValue(true);
  agent = (await signedInAgent()).agent;
  foodId = (await createCategory(agent, 'Food', 'expense')).id;
  await createCategory(agent, 'Travel', 'expense');
});

describe('POST /ai/categorize', () => {
  it("maps the model's answer to one of the user's categories", async () => {
    gemini.generateText.mockResolvedValue('{"categoryName":"food","reason":"Restaurant delivery"}');
    const res = await agent.post('/ai/categorize').send({ merchant: 'Zomato', type: 'expense' }).expect(200);
    expect(res.body).toEqual({
      source: 'gemini',
      suggestion: { categoryId: foodId, categoryName: 'Food', type: 'expense' },
      reason: 'Restaurant delivery',
    });
    expect(res.body).not.toHaveProperty('confidence');
  });

  it("ignores categories that do not exist or belong to someone else", async () => {
    const other = await signedInAgent('Other');
    await createCategory(other.agent, 'Secret Stuff', 'expense');
    gemini.generateText.mockResolvedValue('{"categoryName":"Secret Stuff","reason":"guess"}');

    const res = await agent.post('/ai/categorize').send({ merchant: 'Unknown shop' }).expect(200);
    expect(res.body.suggestion).toBeNull();
    expect(res.body.message).toContain('does not exist');
    // The other user's category names were never sent to the model.
    expect(gemini.generateText.mock.calls[0][0]).not.toContain('Secret Stuff');
  });

  it('handles malformed model output', async () => {
    gemini.generateText.mockResolvedValue('I think it is food!');
    const res = await agent.post('/ai/categorize').send({ merchant: 'Zomato' }).expect(200);
    expect(res.body).toMatchObject({ source: 'unavailable', suggestion: null, message: 'The AI returned an invalid response.' });
  });

  it.each([
    ['provider failure', new AiUnavailableError('provider_error'), 'unavailable right now'],
    ['timeout', new AiUnavailableError('timeout'), 'took too long'],
    ['missing key', new AiUnavailableError('not_configured'), 'AI_API_KEY is not configured'],
  ])('falls back safely on %s', async (_label, error, message) => {
    gemini.generateText.mockRejectedValue(error);
    const res = await agent.post('/ai/categorize').send({ description: 'Taxi to airport' }).expect(200);
    expect(res.body).toMatchObject({ source: 'unavailable', suggestion: null });
    expect(res.body.message).toContain(message);
  });

  it('validates input', async () => {
    await agent.post('/ai/categorize').send({}).expect(400);
    await agent.post('/ai/categorize').send({ merchant: 'x', categoryId: 5 }).expect(400);
  });
});

describe('GET /ai/insights', () => {
  beforeEach(async () => {
    const accountId = (await createAccount(agent, '1000')).id;
    await createTransaction(agent, { accountId, categoryId: foodId, amount: '120.50', type: 'expense', date: '2026-10-05', merchant: 'Private Cafe' });
  });

  const october = '/ai/insights?startDate=2026-10-01&endDate=2026-10-31';

  it('returns calculated facts plus validated AI suggestions', async () => {
    gemini.generateText.mockResolvedValue('["Food is your only expense category.", "Consider a food budget."]');
    const res = await agent.get(october).expect(200);
    expect(res.body.source).toBe('gemini');
    expect(res.body.facts.overview).toMatchObject({ totalExpenses: '120.50', numberOfTransactions: 1 });
    expect(res.body.insights).toHaveLength(2);
    // Only aggregates are shared with the provider, not merchants.
    expect(gemini.generateText.mock.calls[0][0]).not.toContain('Private Cafe');
    expect(gemini.generateText.mock.calls[0][0]).toContain('2026-09-30T18:30:00Z');
  });

  it('rejects invalid structured output but still returns the facts', async () => {
    gemini.generateText.mockResolvedValue('{"insight": 42}');
    const res = await agent.get(october).expect(200);
    expect(res.body).toMatchObject({ source: 'unavailable', insights: [] });
    expect(res.body.facts.overview.totalExpenses).toBe('120.50');
  });

  it('does not call the AI when the period has no transactions', async () => {
    const res = await agent.get('/ai/insights?startDate=2025-01-01&endDate=2025-01-31').expect(200);
    expect(res.body).toMatchObject({ source: 'calculated', insights: [] });
    expect(gemini.generateText).not.toHaveBeenCalled();
  });
});

describe('POST /ai/chat', () => {
  it('answers with Gemini when available', async () => {
    gemini.generateText.mockResolvedValue('You spent 0 this month.');
    const res = await agent.post('/ai/chat').send({ query: 'How much did I spend?' }).expect(200);
    expect(res.body).toEqual({ source: 'gemini', reply: 'You spent 0 this month.' });
  });

  it('falls back to calculated figures when Gemini is not configured', async () => {
    gemini.isAiConfigured.mockReturnValue(false);
    const res = await agent.post('/ai/chat').send({ query: 'balance?' }).expect(200);
    expect(res.body.source).toBe('calculated');
    expect(res.body.reply).toContain('Total balance across all accounts: 0');
    expect(gemini.generateText).not.toHaveBeenCalled();
  });

  it('falls back when the provider fails', async () => {
    gemini.generateText.mockRejectedValue(new AiUnavailableError('timeout'));
    const res = await agent.post('/ai/chat').send({ query: 'Summarise my month' }).expect(200);
    expect(res.body.source).toBe('calculated');
    expect(res.body.reply).toContain('took too long');
  });

  it('limits query length', async () => {
    await agent.post('/ai/chat').send({ query: 'x'.repeat(501) }).expect(400);
  });
});
