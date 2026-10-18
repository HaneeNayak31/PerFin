import { createAccount, createCategory, createTransaction, resetDatabase, signedInAgent, type Agent } from './helpers.js';

let agent: Agent;
let main: number;
let card: number;
let food: number;
let rent: number;

beforeAll(async () => {
  await resetDatabase();
  agent = (await signedInAgent()).agent;
  main = (await createAccount(agent, '100000')).id;
  card = (await createAccount(agent, '0', 'Card')).id;
  food = (await createCategory(agent, 'Food', 'expense')).id;
  rent = (await createCategory(agent, 'Rent', 'expense')).id;
  const salary = (await createCategory(agent, 'Salary', 'income')).id;

  // 25 food expenses on main: 1..25 October, amount = day * 10
  for (let day = 1; day <= 25; day++) {
    await createTransaction(agent, {
      accountId: main, categoryId: food, type: 'expense', amount: String(day * 10),
      merchant: day === 7 ? '50% Off Pizza' : `Shop ${day}`, date: `2026-10-${String(day).padStart(2, '0')}`,
    });
  }
  await createTransaction(agent, { accountId: card, categoryId: rent, type: 'expense', amount: '15000', date: '2026-10-05', description: 'October rent' });
  await createTransaction(agent, { accountId: main, categoryId: salary, type: 'income', amount: '80000', date: '2026-10-01' });
  // Time-zone edge cases (Asia/Kolkata = UTC+05:30):
  await createTransaction(agent, { accountId: main, type: 'expense', amount: '1', date: '2026-10-31T23:30:00+05:30', merchant: 'Late night' });
  await createTransaction(agent, { accountId: main, type: 'expense', amount: '2', date: '2026-11-01T00:00:00+05:30', merchant: 'Next month' });
});

describe('transaction listing', () => {
  it('paginates in the database and reports totals', async () => {
    const page1 = (await agent.get('/transactions?limit=10').expect(200)).body;
    expect(page1.data).toHaveLength(10);
    expect(page1.meta).toEqual({ page: 1, limit: 10, total: 29, totalPages: 3 });

    const page3 = (await agent.get('/transactions?limit=10&page=3').expect(200)).body;
    expect(page3.data).toHaveLength(9);

    const ids = new Set([...page1.data, ...page3.data].map((t: { id: number }) => t.id));
    expect(ids.size).toBe(19);
  });

  it('sorts by date (newest first by default) and by amount', async () => {
    const byDate = (await agent.get('/transactions?limit=3').expect(200)).body.data;
    expect(byDate.map((t: { merchant: string }) => t.merchant)).toEqual(['Next month', 'Late night', 'Shop 25']);

    const byAmount = (await agent.get('/transactions?sortBy=amount&sortOrder=asc&limit=3').expect(200)).body.data;
    expect(byAmount.map((t: { amount: string }) => t.amount)).toEqual(['1', '2', '10']);

    const largest = (await agent.get('/transactions?sortBy=amount&sortOrder=desc&limit=1').expect(200)).body.data[0];
    expect(largest.amount).toBe('80000');
  });

  it('filters by type, account and category, and includes names', async () => {
    const income = (await agent.get('/transactions?type=income').expect(200)).body;
    expect(income.meta.total).toBe(1);

    const onCard = (await agent.get(`/transactions?accountId=${card}`).expect(200)).body;
    expect(onCard.meta.total).toBe(1);
    expect(onCard.data[0]).toMatchObject({ account: { name: 'Card' }, category: { name: 'Rent' } });

    const foodOnly = (await agent.get(`/transactions?categoryId=${food}&limit=1`).expect(200)).body;
    expect(foodOnly.meta.total).toBe(25);
  });

  it('searches merchant and description, treating % literally', async () => {
    const pct = (await agent.get('/transactions').query({ search: '50%' }).expect(200)).body;
    expect(pct.data.map((t: { merchant: string }) => t.merchant)).toEqual(['50% Off Pizza']);
    const desc = (await agent.get('/transactions?search=RENT').expect(200)).body;
    expect(desc.meta.total).toBe(1);
  });

  it('treats endDate as inclusive in the reporting time zone', async () => {
    const october = (await agent.get('/transactions?startDate=2026-10-31&endDate=2026-10-31').expect(200)).body;
    expect(october.data.map((t: { merchant: string }) => t.merchant)).toEqual(['Late night']);
    const november = (await agent.get('/transactions?startDate=2026-11-01').expect(200)).body;
    expect(november.data.map((t: { merchant: string }) => t.merchant)).toEqual(['Next month']);
  });

  it('returns an empty page with consistent metadata', async () => {
    const empty = (await agent.get('/transactions?search=nothing-matches').expect(200)).body;
    expect(empty).toEqual({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
  });

  it.each([
    'limit=101', 'limit=0', 'page=0', 'page=abc', 'type=transfer', 'sortBy=userId', 'sortOrder=sideways',
    'startDate=2026-13-01', 'startDate=2026-10-10&endDate=2026-10-01',
  ])('rejects invalid query %s', async (query) => {
    await agent.get(`/transactions?${query}`).expect(400);
  });
});

describe('analytics', () => {
  it('computes overview totals in the database', async () => {
    const all = (await agent.get('/analytics/overview').expect(200)).body;
    // Food: 10+20+...+250 = 3250; rent 15000; edge cases 1 + 2
    expect(all).toEqual({
      totalIncome: '80000',
      totalExpenses: '18253',
      savings: '61747',
      currentBalance: '161747',
      numberOfTransactions: 29,
    });

    const firstWeek = (await agent.get('/analytics/overview?startDate=2026-10-01&endDate=2026-10-07').expect(200)).body;
    expect(firstWeek).toMatchObject({ totalIncome: '80000', totalExpenses: '15280', numberOfTransactions: 9 });
  });

  it('groups months in the reporting time zone', async () => {
    const monthly = (await agent.get('/analytics/monthly').expect(200)).body;
    expect(monthly).toEqual([
      { month: '2026-10', income: '80000', expense: '18251', net: '61749' },
      { month: '2026-11', income: '0', expense: '2', net: '-2' },
    ]);
  });

  it('breaks expenses down by category, including uncategorised spending', async () => {
    const categories = (await agent.get('/analytics/categories?endDate=2026-10-31').expect(200)).body;
    expect(categories).toEqual([
      { categoryId: rent, category: 'Rent', amount: '15000' },
      { categoryId: food, category: 'Food', amount: '3250' },
      { categoryId: null, category: 'Uncategorized', amount: '1' },
    ]);
  });

  it('reports budget progress for a month', async () => {
    await agent.post('/budgets').send({ categoryId: food, amount: '5000', month: 10, year: 2026 }).expect(201);
    await agent.post('/budgets').send({ categoryId: food, amount: '1', month: 10, year: 2026 }).expect(409);
    const progress = (await agent.get('/budgets/current?year=2026&month=10').expect(200)).body;
    expect(progress).toEqual([
      expect.objectContaining({ categoryName: 'Food', amount: '5000', spent: '3250', remaining: '1750', percentageUsed: 65 }),
    ]);
  });
});
