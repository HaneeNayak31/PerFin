import { api } from './api';

export const getBudgets = async () => {
  const { data } = await api.get('/budgets/current');
  return data;
};
