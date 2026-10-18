import { createAccount, createCategory, createTransaction, resetDatabase, signedInAgent } from './helpers.js';

beforeEach(resetDatabase);

describe('user data isolation', () => {
  it("prevents one user from reading or changing another user's data", async () => {
    const alice = await signedInAgent('Alice');
    const bob = await signedInAgent('Bob');

    const account = await createAccount(alice.agent, '500.00');
    const category = await createCategory(alice.agent, 'Food', 'expense');
    const tx = await createTransaction(alice.agent, {
      accountId: account.id, categoryId: category.id, amount: '50', type: 'expense', date: '2026-10-01',
    });
    const budget = (await alice.agent.post('/budgets').send({ categoryId: category.id, amount: '100', month: 10, year: 2026 }).expect(201)).body;

    for (const path of [`/accounts/${account.id}`, `/categories/${category.id}`, `/transactions/${tx.id}`, `/budgets/${budget.id}`]) {
      await bob.agent.get(path).expect(404);
      await bob.agent.patch(path).send({}).expect(404);
      await bob.agent.delete(path).expect(404);
    }

    // Bob cannot book onto Alice's account or use her category.
    const bobAccount = await createAccount(bob.agent, '0');
    await bob.agent.post('/transactions').send({ accountId: account.id, amount: '1', type: 'expense', date: '2026-10-01' }).expect(404);
    await bob.agent.post('/transactions').send({ accountId: bobAccount.id, categoryId: category.id, amount: '1', type: 'expense', date: '2026-10-01' }).expect(404);
    await bob.agent.post('/budgets').send({ categoryId: category.id, amount: '1', month: 10, year: 2026 }).expect(404);

    // A userId in the body is rejected rather than trusted.
    await bob.agent.post('/accounts').send({ name: 'x', type: 'cash', balance: '0', userId: 1 }).expect(400);

    // Lists and analytics only contain Bob's own data.
    expect((await bob.agent.get('/accounts').expect(200)).body).toHaveLength(1);
    expect((await bob.agent.get('/transactions').expect(200)).body.meta.total).toBe(0);
    expect((await bob.agent.get('/categories').expect(200)).body).toEqual([]);
    const overview = (await bob.agent.get('/analytics/overview').expect(200)).body;
    expect(overview).toMatchObject({ totalExpenses: '0', numberOfTransactions: 0, currentBalance: '0' });

    // Alice's data is untouched.
    expect((await alice.agent.get(`/accounts/${account.id}`).expect(200)).body.balance).toBe('450.00');
  });
});

describe('categories', () => {
  it('treats names case-insensitively and allows the same name for different users', async () => {
    const alice = await signedInAgent('Alice');
    const bob = await signedInAgent('Bob');
    const food = await createCategory(alice.agent, 'Food', 'expense');
    await alice.agent.post('/categories').send({ name: 'food', type: 'expense' }).expect(409);
    await alice.agent.post('/categories').send({ name: '  FOOD ', type: 'income' }).expect(409);
    await createCategory(bob.agent, 'Food', 'expense');

    const rent = await createCategory(alice.agent, 'Rent', 'expense');
    await alice.agent.patch(`/categories/${rent.id}`).send({ name: 'FOOD' }).expect(409);
    await alice.agent.patch(`/categories/${food.id}`).send({ name: 'food' }).expect(200);
  });

  it('protects categories that are in use', async () => {
    const { agent } = await signedInAgent();
    const account = await createAccount(agent, '100');
    const food = await createCategory(agent, 'Food', 'expense');
    await createTransaction(agent, { accountId: account.id, categoryId: food.id, amount: '5', type: 'expense', date: '2026-10-01' });
    await agent.patch(`/categories/${food.id}`).send({ type: 'income' }).expect(409);
    await agent.delete(`/categories/${food.id}`).expect(409);
  });
});
