import type { BudgetProgress } from '@/types/api';
import { api } from './api';

export const getBudgets = async (params: { year?: number; month?: number } = {}) =>
  (await api.get<BudgetProgress[]>('/budgets/current', { params })).data;

export const createBudget = async (input: { categoryId: number; amount: string; month: number; year: number }) =>
  (await api.post('/budgets', input)).data;

export const deleteBudget = async (id: number) => {
  await api.delete(`/budgets/${id}`);
};
