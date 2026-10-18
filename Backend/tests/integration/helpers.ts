import request from 'supertest';
import type TestAgent from 'supertest/lib/agent.js';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/env.js';
import { db } from '../../src/prisma/db.js';

export const app = createApp();

/** Empties every table. Guarded so it can only ever run against a test database. */
export async function resetDatabase() {
  const databaseName = new URL(config.databaseUrl).pathname.slice(1);
  if (config.nodeEnv !== 'test' || !/test/i.test(databaseName)) {
    throw new Error(`resetDatabase refused to run against "${databaseName}"`);
  }
  await db.runtime().execute(
    db.raw.sql`TRUNCATE "transaction", "budget", "category", "account", "user" RESTART IDENTITY CASCADE`
      .affectedCount()
      .build(),
  );
}

export type Agent = InstanceType<typeof TestAgent>;

let userCounter = 0;

/** Registers a new user and returns a supertest agent that carries their auth cookie. */
export async function signedInAgent(name = 'Test User'): Promise<{ agent: Agent; email: string }> {
  userCounter++;
  const email = `user${userCounter}-${Date.now()}@example.com`;
  const agent = request.agent(app);
  await agent.post('/auth/register').send({ email, password: 'password123', name }).expect(201);
  await agent.post('/auth/login').send({ email, password: 'password123' }).expect(200);
  return { agent, email };
}

export async function createAccount(agent: Agent, balance = '1000.00', name = 'Main') {
  const res = await agent.post('/accounts').send({ name, type: 'savings', balance }).expect(201);
  return res.body as { id: number; balance: string };
}

export async function createCategory(agent: Agent, name: string, type: 'income' | 'expense') {
  const res = await agent.post('/categories').send({ name, type }).expect(201);
  return res.body as { id: number };
}

export async function createTransaction(agent: Agent, body: Record<string, unknown>) {
  const res = await agent.post('/transactions').send(body);
  if (res.status !== 201) throw new Error(`create failed ${res.status}: ${JSON.stringify(res.body)}`);
  return res.body as { id: number; amount: string; accountId: number };
}

export async function balanceOf(agent: Agent, accountId: number): Promise<string> {
  const res = await agent.get(`/accounts/${accountId}`).expect(200);
  return res.body.balance as string;
}

export { request, db };
