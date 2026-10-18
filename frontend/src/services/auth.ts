import type { User } from '@/types/api';
import { api } from './api';

export const register = async (input: { name: string; email: string; password: string }) =>
  (await api.post<User>('/auth/register', input)).data;

export const login = async (input: { email: string; password: string }) =>
  (await api.post<{ user: User }>('/auth/login', input)).data.user;

export const logout = async () => {
  await api.post('/auth/logout');
};

export const getMe = async () => (await api.get<User>('/auth/me')).data;
