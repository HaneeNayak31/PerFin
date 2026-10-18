import type { Category, TransactionType } from '@/types/api';
import { api } from './api';

export const getCategories = async () => (await api.get<Category[]>('/categories')).data;

export const createCategory = async (input: { name: string; type: TransactionType }) =>
  (await api.post<Category>('/categories', input)).data;

export const deleteCategory = async (id: number) => {
  await api.delete(`/categories/${id}`);
};
