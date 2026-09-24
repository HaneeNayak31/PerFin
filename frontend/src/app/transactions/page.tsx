"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getTransactions } from '@/services/transactions';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, ArrowLeftRight } from 'lucide-react';

const T = {
  ink: '#101828', secondary: '#344054', muted: '#667085', mutedLight: '#98A2B3',
  surface: '#FFFFFF', bg: '#F6F8F7', border: '#E4E7EC', borderSubtle: '#F2F4F7',
  brand: '#10B981', brandDark: '#047857', brandSubtle: '#ECFDF5',
  income: '#12B76A', incomeSubtle: '#ECFDF5', expense: '#F04438', expenseSubtle: '#FEF3F2',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    getTransactions({ page, limit: 20 })
      .then(data => { setTransactions(data.data ?? []); if (data.meta) setMeta(data.meta); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const displayed = search
    ? transactions.filter(tx =>
        (tx.merchant || '').toLowerCase().includes(search.toLowerCase()) ||
        (tx.description || '').toLowerCase().includes(search.toLowerCase()))
    : transactions;

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>Transactions</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
            {meta.total > 0 ? `${meta.total} transactions total` : 'Manage all your transactions.'}
          </p>
        </div>
        <button className="flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: T.brandDark, boxShadow: '0 1px 3px rgba(4,120,87,0.3)' }}>
          <Plus size={14} strokeWidth={2.5} /> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.mutedLight }} />
          <input type="text" placeholder="Search transactions…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 text-[13px] rounded-lg outline-none transition-all"
            style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, color: T.ink }}
            onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = T.brand; }}
            onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; }} />
        </div>
        <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium"
          style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, color: T.secondary }}>
          <Filter size={13} /> Filters
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-lg animate-pulse" style={{ backgroundColor: T.borderSubtle }} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: T.bg }}>
              <ArrowLeftRight size={24} style={{ color: T.mutedLight }} />
            </div>
            <h3 className="text-[16px] font-bold mb-1" style={{ color: T.ink }}>No transactions yet</h3>
            <p className="text-[13px] mb-5" style={{ color: T.muted }}>Add your first transaction to start understanding your spending.</p>
            <button className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
              style={{ backgroundColor: T.ink }}>
              <Plus size={14} /> Add Transaction
            </button>
          </div>
        ) : (
          <>
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, backgroundColor: T.bg }}>
                  {['Date', 'Merchant', 'Description', 'Type', 'Amount'].map(h => (
                    <th key={h} className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wider ${h === 'Amount' ? 'text-right' : ''}`}
                      style={{ color: T.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((tx, i) => (
                  <tr key={i} className="transition-colors" style={{ borderBottom: `1px solid ${T.borderSubtle}` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = T.bg; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
                    <td className="px-5 py-3.5 whitespace-nowrap" style={{ color: T.mutedLight }}>
                      {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                          style={{ backgroundColor: T.bg, color: T.secondary }}>
                          {(tx.merchant || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium" style={{ color: T.ink }}>{tx.merchant || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5" style={{ color: T.muted }}>{tx.description || '—'}</td>
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
                    <td className="px-5 py-3.5 text-right font-semibold whitespace-nowrap"
                      style={{ color: tx.type === 'income' ? T.income : T.ink }}>
                      {tx.type === 'income' ? '+' : '−'}{fmt(Number(tx.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: `1px solid ${T.border}`, backgroundColor: T.bg }}>
                <p className="text-[12px]" style={{ color: T.muted }}>Page {meta.page} of {meta.totalPages}</p>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    className="p-1.5 rounded-md transition-colors disabled:opacity-30"
                    style={{ border: `1px solid ${T.border}`, color: T.secondary }}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(meta.totalPages, p+1))} disabled={page===meta.totalPages}
                    className="p-1.5 rounded-md transition-colors disabled:opacity-30"
                    style={{ border: `1px solid ${T.border}`, color: T.secondary }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
