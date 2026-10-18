"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import TransactionForm from '@/components/TransactionForm';
import { ErrorBanner } from '@/components/ui/form';
import { T } from '@/components/ui/theme';
import { useApiData } from '@/hooks/useApiData';
import { formatDate, formatMoney } from '@/lib/format';
import { getAccounts } from '@/services/accounts';
import { apiErrorMessage } from '@/services/api';
import { getCategories } from '@/services/categories';
import { deleteTransaction, getTransactions, type TransactionQuery } from '@/services/transactions';
import type { Transaction } from '@/types/api';
import {
  Plus, Search, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, ArrowLeftRight, Pencil, Trash2,
} from 'lucide-react';

const PAGE_SIZE = 20;

const SORTS: Record<string, Pick<TransactionQuery, 'sortBy' | 'sortOrder'>> = {
  newest: { sortBy: 'date', sortOrder: 'desc' },
  oldest: { sortBy: 'date', sortOrder: 'asc' },
  largest: { sortBy: 'amount', sortOrder: 'desc' },
  smallest: { sortBy: 'amount', sortOrder: 'asc' },
};

const controlStyle = { backgroundColor: T.surface, border: `1px solid ${T.border}`, color: T.secondary };

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sort, setSort] = useState('newest');
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Wait until the user stops typing before searching on the server.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const query: TransactionQuery = {
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    type: type === 'income' || type === 'expense' ? type : undefined,
    accountId: accountId ? Number(accountId) : undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    ...SORTS[sort],
  };
  const list = useApiData(() => getTransactions(query), JSON.stringify(query));
  const accounts = useApiData(getAccounts, 'accounts');
  const categories = useApiData(getCategories, 'categories');

  const transactions = list.data?.data ?? [];
  const meta = list.data?.meta ?? { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };
  const hasFilters = Boolean(search || type || accountId || categoryId || startDate || endDate);
  const showSkeleton = list.loading && !list.data;

  const filterChange = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(event.target.value);
    setPage(1);
  };

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (tx: Transaction) => { setEditing(tx); setFormOpen(true); };

  const handleDelete = async (tx: Transaction) => {
    const label = tx.merchant || tx.description || 'this transaction';
    if (!window.confirm(`Delete ${label} (${formatMoney(tx.amount)})? The account balance will be adjusted.`)) return;
    setDeletingId(tx.id);
    setActionError(null);
    try {
      await deleteTransaction(tx.id);
      if (transactions.length === 1 && page > 1) setPage(page - 1);
      else list.reload();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>Transactions</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
            {meta.total > 0 ? `${meta.total} transaction${meta.total === 1 ? '' : 's'}${hasFilters ? ' match your filters' : ' total'}` : 'Manage all your transactions.'}
          </p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: T.brandDark, boxShadow: '0 1px 3px rgba(4,120,87,0.3)' }}>
          <Plus size={14} strokeWidth={2.5} /> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.mutedLight }} />
          <input type="search" placeholder="Search merchant or description…" value={searchInput} maxLength={100}
            onChange={e => setSearchInput(e.target.value)} aria-label="Search transactions"
            className="w-full pl-8 pr-4 py-2 text-[13px] rounded-lg outline-none" style={{ ...controlStyle, color: T.ink }} />
        </div>
        <select aria-label="Type" value={type} onChange={filterChange(setType)} className="px-3 py-2 text-[12.5px] rounded-lg" style={controlStyle}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select aria-label="Account" value={accountId} onChange={filterChange(setAccountId)} className="px-3 py-2 text-[12.5px] rounded-lg" style={controlStyle}>
          <option value="">All accounts</option>
          {(accounts.data ?? []).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select aria-label="Category" value={categoryId} onChange={filterChange(setCategoryId)} className="px-3 py-2 text-[12.5px] rounded-lg" style={controlStyle}>
          <option value="">All categories</option>
          {(categories.data ?? []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" aria-label="From date" value={startDate} onChange={filterChange(setStartDate)} className="px-3 py-2 text-[12.5px] rounded-lg" style={controlStyle} />
        <input type="date" aria-label="To date" value={endDate} min={startDate || undefined} onChange={filterChange(setEndDate)} className="px-3 py-2 text-[12.5px] rounded-lg" style={controlStyle} />
        <select aria-label="Sort" value={sort} onChange={filterChange(setSort)} className="px-3 py-2 text-[12.5px] rounded-lg" style={controlStyle}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="largest">Largest amount</option>
          <option value="smallest">Smallest amount</option>
        </select>
      </div>

      <ErrorBanner message={actionError ?? list.error} />

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', opacity: list.loading && list.data ? 0.6 : 1 }}>
        {showSkeleton ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: T.borderSubtle }} />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: T.bg }}>
              <ArrowLeftRight size={24} style={{ color: T.mutedLight }} />
            </div>
            <h3 className="text-[16px] font-bold mb-1" style={{ color: T.ink }}>{hasFilters ? 'No matching transactions' : 'No transactions yet'}</h3>
            <p className="text-[13px] mb-5" style={{ color: T.muted }}>
              {hasFilters ? 'Try changing or clearing the filters.' : 'Add your first transaction to start understanding your spending.'}
            </p>
            {!hasFilters && (
              <button onClick={openNew} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg" style={{ backgroundColor: T.ink }}>
                <Plus size={14} /> Add Transaction
              </button>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, backgroundColor: T.bg }}>
                  {['Date', 'Merchant', 'Category', 'Account', 'Type', 'Amount', ''].map((h, i) => (
                    <th key={i} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${h === 'Amount' ? 'text-right' : ''}`}
                      style={{ color: T.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="group hover:bg-[#F6F8F7] transition-colors" style={{ borderBottom: `1px solid ${T.borderSubtle}` }}>
                    <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: T.mutedLight }}>{formatDate(tx.date)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ backgroundColor: T.bg, color: T.secondary }}>
                          {(tx.merchant || tx.description || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate" style={{ color: T.ink }}>{tx.merchant || '—'}</p>
                          {tx.description && <p className="text-[11.5px] truncate" style={{ color: T.mutedLight }}>{tx.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: T.muted }}>{tx.category?.name ?? 'Uncategorized'}</td>
                    <td className="px-5 py-3.5" style={{ color: T.muted }}>{tx.account?.name ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{
                          backgroundColor: tx.type === 'income' ? T.incomeSubtle : T.expenseSubtle,
                          color: tx.type === 'income' ? T.income : T.expense,
                        }}>
                        {tx.type === 'income' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-semibold whitespace-nowrap" style={{ color: tx.type === 'income' ? T.income : T.ink }}>
                      {tx.type === 'income' ? '+' : '−'}{formatMoney(tx.amount, tx.account?.currency)}
                    </td>
                    <td className="px-3 py-3.5 whitespace-nowrap text-right">
                      <button onClick={() => openEdit(tx)} aria-label="Edit transaction" className="p-1.5 rounded-md" style={{ color: T.muted }}>
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => handleDelete(tx)} disabled={deletingId === tx.id} aria-label="Delete transaction"
                        className="p-1.5 rounded-md disabled:opacity-40" style={{ color: T.expense }}>
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.bg }}>
                <p className="text-[12px]" style={{ color: T.muted }}>Page {meta.page} of {meta.totalPages}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page"
                    className="p-1.5 rounded-md transition-colors disabled:opacity-30" style={{ border: `1px solid ${T.border}`, color: T.secondary }}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} aria-label="Next page"
                    className="p-1.5 rounded-md transition-colors disabled:opacity-30" style={{ border: `1px solid ${T.border}`, color: T.secondary }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {formOpen && (
        <TransactionForm
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          transaction={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); list.reload(); }}
        />
      )}
    </DashboardLayout>
  );
}
