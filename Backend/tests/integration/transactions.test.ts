import * as transactionService from '../../src/services/transaction.service.js';
import type { CreateTransactionDto } from '../../src/validation/dtos.js';
import {
  balanceOf,
  createAccount,
  createCategory,
  createTransaction,
  db,
  resetDatabase,
  signedInAgent,
  type Agent,
} from './helpers.js';

let agent: Agent;
let accountId: number;
let food: number;
let salary: number;

beforeEach(async () => {
  await resetDatabase();
  agent = (await signedInAgent()).agent;
  accountId = (await createAccount(agent, '1000.00')).id;
  food = (await createCategory(agent, 'Food', 'expense')).id;
  salary = (await createCategory(agent, 'Salary', 'income')).id;
});

const expense = (overrides: Record<string, unknown> = {}) => ({
  accountId, categoryId: food, amount: '250.25', type: 'expense', merchant: 'Cafe', date: '2026-10-10', ...overrides,
});

describe('creating transactions', () => {
  it('income increases and expense decreases the balance exactly', async () => {
    await createTransaction(agent, { accountId, categoryId: salary, amount: '0.10', type: 'income', date: '2026-10-01' });
    await createTransaction(agent, { accountId, categoryId: salary, amount: '0.20', type: 'income', date: '2026-10-01' });
    expect(await balanceOf(agent, accountId)).toBe('1000.30'); // not 1000.3000000000000004

    await createTransaction(agent, expense());
    expect(await balanceOf(agent, accountId)).toBe('750.05');
  });

  it('allows a transaction without a category', async () => {
    await createTransaction(agent, expense({ categoryId: undefined }));
    expect(await balanceOf(agent, accountId)).toBe('749.75');
  });

  it.each([
    ['zero amount', { amount: '0' }],
    ['negative amount', { amount: '-10' }],
    ['three decimals', { amount: '1.005' }],
    ['text amount', { amount: 'ten' }],
    ['unsupported type', { type: 'transfer' }],
    ['missing account', { accountId: undefined }],
    ['bad date', { date: '31-12-2026' }],
  ])('rejects %s without touching the balance', async (_label, overrides) => {
    await agent.post('/transactions').send(expense(overrides)).expect(400);
    expect(await balanceOf(agent, accountId)).toBe('1000.00');
  });

  it('rejects unknown accounts and categories', async () => {
    await agent.post('/transactions').send(expense({ accountId: 999 })).expect(404);
    await agent.post('/transactions').send(expense({ categoryId: 999 })).expect(404);
    expect(await balanceOf(agent, accountId)).toBe('1000.00');
  });

  it('rejects a category whose type does not match the transaction', async () => {
    const res = await agent.post('/transactions').send(expense({ categoryId: salary })).expect(400);
    expect(res.body.message).toContain('Category is for income transactions');
  });
});

describe('updating transactions', () => {
  it('reverses the old amount before applying the new one', async () => {
    const tx = await createTransaction(agent, expense({ amount: '100' }));
    await agent.patch(`/transactions/${tx.id}`).send({ amount: '40.50' }).expect(200);
    expect(await balanceOf(agent, accountId)).toBe('959.50');
  });

  it('handles expense -> income and back', async () => {
    const tx = await createTransaction(agent, expense({ amount: '100', categoryId: null }));
    expect(await balanceOf(agent, accountId)).toBe('900.00');
    await agent.patch(`/transactions/${tx.id}`).send({ type: 'income', categoryId: salary }).expect(200);
    expect(await balanceOf(agent, accountId)).toBe('1100.00');
    await agent.patch(`/transactions/${tx.id}`).send({ type: 'expense', categoryId: food }).expect(200);
    expect(await balanceOf(agent, accountId)).toBe('900.00');
  });

  it('rejects a type change that leaves an incompatible category', async () => {
    const tx = await createTransaction(agent, expense({ amount: '100' }));
    await agent.patch(`/transactions/${tx.id}`).send({ type: 'income' }).expect(400);
    expect(await balanceOf(agent, accountId)).toBe('900.00');
  });

  it('moves the effect when the transaction moves to another account', async () => {
    const savings = (await createAccount(agent, '50.00', 'Savings')).id;
    const tx = await createTransaction(agent, expense({ amount: '100' }));
    await agent.patch(`/transactions/${tx.id}`).send({ accountId: savings, amount: '30' }).expect(200);
    expect(await balanceOf(agent, accountId)).toBe('1000.00');
    expect(await balanceOf(agent, savings)).toBe('20.00');
  });

  it('updates date, merchant and clears the category', async () => {
    const tx = await createTransaction(agent, expense());
    const res = await agent.patch(`/transactions/${tx.id}`).send({ date: '2026-09-01', merchant: 'Bakery', categoryId: null }).expect(200);
    expect(res.body).toMatchObject({ merchant: 'Bakery', categoryId: null, date: '2026-08-31T18:30:00Z' });
    expect(await balanceOf(agent, accountId)).toBe('749.75');
  });

  it('returns 404 for a missing transaction', async () => {
    await agent.patch('/transactions/999').send({ amount: '1' }).expect(404);
  });
});

describe('deleting transactions', () => {
  it('reverses the effect on the balance', async () => {
    const income = await createTransaction(agent, { accountId, amount: '500', type: 'income', date: '2026-10-01' });
    const spend = await createTransaction(agent, expense({ amount: '200' }));
    await agent.delete(`/transactions/${spend.id}`).expect(204);
    expect(await balanceOf(agent, accountId)).toBe('1500.00');
    await agent.delete(`/transactions/${income.id}`).expect(204);
    expect(await balanceOf(agent, accountId)).toBe('1000.00');
    await agent.delete(`/transactions/${income.id}`).expect(404);
  });

  it('refuses to delete an account that still has transactions', async () => {
    await createTransaction(agent, expense());
    await agent.delete(`/accounts/${accountId}`).expect(409);
  });
});

describe('atomicity', () => {
  it('rolls back the balance change when saving the transaction row fails', async () => {
    const user = await db.orm.public.User.first();
    // Bypass API validation so the database CHECK constraint rejects the row
    // *after* the balance has already been updated inside the transaction.
    const invalid = { accountId, amount: '100', type: 'transfer', date: '2026-10-01' } as unknown as CreateTransactionDto;
    await expect(transactionService.createTransaction(user!.id, invalid)).rejects.toThrow();
    expect(await balanceOf(agent, accountId)).toBe('1000.00');
    expect((await agent.get('/transactions').expect(200)).body.meta.total).toBe(0);
  });

  it('applies 25 concurrent transactions without losing any update', async () => {
    const requests = Array.from({ length: 25 }, (_, i) =>
      agent.post('/transactions').send(expense({ amount: `${i + 1}.01`, categoryId: null })),
    );
    const responses = await Promise.all(requests);
    expect(responses.every((res) => res.status === 201)).toBe(true);
    // Sum of 1.01 .. 25.01 = 325 + 0.25 = 325.25
    expect(await balanceOf(agent, accountId)).toBe('674.75');
  });

  it('stays consistent when the same transaction is edited and deleted at the same time', async () => {
    const tx = await createTransaction(agent, expense({ amount: '100' }));
    const results = await Promise.all([
      agent.patch(`/transactions/${tx.id}`).send({ amount: '300' }),
      agent.delete(`/transactions/${tx.id}`),
      agent.patch(`/transactions/${tx.id}`).send({ amount: '50' }),
    ]);
    // Whatever order the database serialised them in, the delete wins in the end
    // and the balance must equal the opening balance exactly once.
    expect(results[1].status).toBe(204);
    expect(await balanceOf(agent, accountId)).toBe('1000.00');
  });

  it('keeps balances right under concurrent cross-account moves', async () => {
    const second = (await createAccount(agent, '1000.00', 'Second')).id;
    const a = await createTransaction(agent, expense({ amount: '10', categoryId: null }));
    const b = await createTransaction(agent, expense({ accountId: second, amount: '20', categoryId: null }));
    const results = await Promise.all([
      agent.patch(`/transactions/${a.id}`).send({ accountId: second }),
      agent.patch(`/transactions/${b.id}`).send({ accountId }),
    ]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(await balanceOf(agent, accountId)).toBe('980.00');
    expect(await balanceOf(agent, second)).toBe('990.00');
  });
});

describe('accounts', () => {
  it('does not allow overwriting the balance directly', async () => {
    await agent.patch(`/accounts/${accountId}`).send({ balance: '999999' }).expect(400);
    const res = await agent.patch(`/accounts/${accountId}`).send({ name: 'Renamed', currency: 'usd' }).expect(200);
    expect(res.body).toMatchObject({ name: 'Renamed', currency: 'USD', balance: '1000.00' });
  });
});

describe('CSV import and export', () => {
  it('imports valid rows, reports bad ones, and exports them again', async () => {
    const csv = [
      'date,amount,type,accountId,categoryId,description,merchant',
      `2026-10-01,100.00,income,${accountId},${salary},"Bonus, October",`,
      `2026-10-02,40.5,expense,${accountId},${food},Lunch,"=HYPERLINK(""x"")"`,
      `2026-10-03,1.999,expense,${accountId},,Bad amount,`,
    ].join('\n');
    const res = await agent.post('/transactions/import').set('Content-Type', 'text/csv').send(csv).expect(200);
    expect(res.body).toMatchObject({ totalRows: 3, successful: 2, failed: 1 });
    expect(res.body.errors[0]).toMatch(/^Row 4: Validation failed/);
    expect(await balanceOf(agent, accountId)).toBe('1059.50');

    const exported = await agent.get('/transactions/export').expect(200);
    expect(exported.headers['content-type']).toContain('text/csv');
    expect(exported.text).toContain('"Bonus, October"');
    expect(exported.text).toContain(`"'=HYPERLINK(""x"")"`); // formula neutralised
  });
});
