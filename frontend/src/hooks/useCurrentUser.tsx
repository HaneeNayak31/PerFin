"use client";

import React, { createContext, useContext } from 'react';
import { getMe } from '@/services/auth';
import type { User } from '@/types/api';
import { useApiData } from './useApiData';

const CurrentUserContext = createContext<User | null>(null);

/** Loads the signed-in user once per page; a 401 redirects to /login (see api.ts). */
export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  const user = useApiData(getMe, 'me').data ?? null;
  return <CurrentUserContext.Provider value={user}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): User | null {
  return useContext(CurrentUserContext);
}
