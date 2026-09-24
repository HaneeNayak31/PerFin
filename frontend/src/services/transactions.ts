import { api } from './api';

export const getTransactions = async (params: { page?: number; limit?: number; search?: string } = {}) => {
  const { data } = await api.get('/transactions', { params });
  return data;
};
