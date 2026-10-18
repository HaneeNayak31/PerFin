// Shapes returned by the PerFin Express API. Money is always a decimal string
// (e.g. "1250.50") so no precision is lost on the way to the browser.

export type TransactionType = 'income' | 'expense';
export type AccountType = 'checking' | 'savings' | 'cash' | 'credit';

export interface User {
  id: number;
  email: string;
  name: string | null;
}

export interface Account {
  id: number;
  name: string;
  type: AccountType;
  balance: string;
  currency: string;
}

export interface Category {
  id: number;
  name: string;
  type: TransactionType;
}

export interface Transaction {
  id: number;
  accountId: number;
  categoryId: number | null;
  amount: string;
  type: TransactionType;
  description: string | null;
  merchant: string | null;
  date: string;
  account?: { id: number; name: string; currency: string } | null;
  category?: { id: number; name: string; type: TransactionType } | null;
}

export interface Page<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface Overview {
  totalIncome: string;
  totalExpenses: string;
  savings: string;
  currentBalance: string;
  numberOfTransactions: number;
}

export interface MonthlyRow {
  month: string;
  income: string;
  expense: string;
  net: string;
}

export interface CategoryBreakdownRow {
  categoryId: number | null;
  category: string;
  amount: string;
}

export interface BudgetProgress {
  id: number;
  categoryId: number;
  categoryName: string;
  amount: string;
  month: number;
  year: number;
  spent: string;
  remaining: string;
  percentageUsed: number;
}

export interface ChatResponse {
  source: 'gemini' | 'calculated';
  reply: string;
}
