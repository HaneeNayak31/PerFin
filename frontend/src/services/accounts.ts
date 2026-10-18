import type { Account, AccountType } from '@/types/api';
import { api } from './api';

export const getAccounts = async () => (await api.get<Account[]>('/accounts')).data;

export const createAccount = async (input: { name: string; type: AccountType; balance: string; currency: string }) =>
  (await api.post<Account>('/accounts', input)).data;

export const updateAccount = async (id: number, input: { name?: string; type?: AccountType; currency?: string }) =>
  (await api.patch<Account>(`/accounts/${id}`, input)).data;

export const deleteAccount = async (id: number) => {
  await api.delete(`/accounts/${id}`);
};
