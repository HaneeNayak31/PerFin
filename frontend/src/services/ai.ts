import type { ChatResponse } from '@/types/api';
import { api } from './api';

export const askAssistant = async (query: string) => (await api.post<ChatResponse>('/ai/chat', { query })).data;
