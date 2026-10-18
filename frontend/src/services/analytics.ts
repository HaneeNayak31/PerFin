import type { CategoryBreakdownRow, MonthlyRow, Overview } from '@/types/api';
import { api } from './api';

export interface DateRange {
  startDate?: string;
  endDate?: string;
}

export const getOverview = async (range: DateRange = {}) =>
  (await api.get<Overview>('/analytics/overview', { params: range })).data;

export const getMonthly = async (range: DateRange = {}) =>
  (await api.get<MonthlyRow[]>('/analytics/monthly', { params: range })).data;

export const getCategories = async (range: DateRange = {}) =>
  (await api.get<CategoryBreakdownRow[]>('/analytics/categories', { params: range })).data;
