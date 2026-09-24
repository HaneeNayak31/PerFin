import { api } from './api';

export const getOverview = async () => {
  const { data } = await api.get('/analytics/overview');
  return data;
};

export const getMonthly = async () => {
  const { data } = await api.get('/analytics/monthly');
  return data;
};

export const getCategories = async () => {
  const { data } = await api.get('/analytics/categories');
  return data;
};
