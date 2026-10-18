import { db } from '../prisma/db.js';
import { conflict, isForeignKeyViolation, notFound } from '../utils/errors.js';
import type { CreateAccountDto, UpdateAccountDto } from '../validation/dtos.js';

export async function listAccounts(userId: number) {
  return db.orm.public.Account.where({ userId }).orderBy((a) => a.id.asc()).all();
}

export async function getAccount(userId: number, accountId: number) {
  const account = await db.orm.public.Account.where({ id: accountId, userId }).first();
  if (!account) throw notFound('Account not found');
  return account;
}

export async function createAccount(userId: number, input: CreateAccountDto) {
  return db.orm.public.Account.create({
    userId,
    name: input.name,
    type: input.type,
    balance: input.balance,
    currency: input.currency ?? 'INR',
  });
}

/**
 * The balance is intentionally not editable here: after the opening balance it
 * must only change through transactions, otherwise the ledger and the balance
 * drift apart. Record an income/expense adjustment instead.
 */
export async function updateAccount(userId: number, accountId: number, input: UpdateAccountDto) {
  await getAccount(userId, accountId);
  const changes: { name?: string; type?: UpdateAccountDto['type']; currency?: string } = {};
  if (input.name !== undefined) changes.name = input.name;
  if (input.type !== undefined) changes.type = input.type;
  if (input.currency !== undefined) changes.currency = input.currency;
  if (Object.keys(changes).length === 0) return getAccount(userId, accountId);

  const updated = await db.orm.public.Account.where({ id: accountId, userId }).update(changes);
  if (!updated) throw notFound('Account not found');
  return updated;
}

export async function deleteAccount(userId: number, accountId: number): Promise<void> {
  await getAccount(userId, accountId);
  try {
    await db.orm.public.Account.where({ id: accountId, userId }).delete();
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw conflict('This account still has transactions. Delete or move them first.');
    }
    throw error;
  }
}
