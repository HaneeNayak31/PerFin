import type { Page, Transaction, TransactionType } from '@/types/api';
import { api } from './api';

export interface TransactionQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: TransactionType;
  accountId?: number;
  categoryId?: number;
  startDate?: string;
  endDate?: string;
  sortBy?: 'date' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface TransactionInput {
  accountId: number;
  categoryId: number | null;
  amount: string;
  type: TransactionType;
  date: string;
  merchant?: string;
  description?: string;
}

export const getTransactions = async (params: TransactionQuery = {}) => {
  // Drop empty filters so they are not sent as "?search=".
  const cleaned = Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));
  return (await api.get<Page<Transaction>>('/transactions', { params: cleaned })).data;
};

export const createTransaction = async (input: TransactionInput) =>
  (await api.post<Transaction>('/transactions', input)).data;

export const updateTransaction = async (id: number, input: Partial<TransactionInput>) =>
  (await api.patch<Transaction>(`/transactions/${id}`, input)).data;

export const deleteTransaction = async (id: number) => {
  await api.delete(`/transactions/${id}`);
};
