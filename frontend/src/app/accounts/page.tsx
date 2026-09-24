"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/services/api';
import { Plus, CreditCard, Wallet, Landmark, Building2, Edit2, Trash2 } from 'lucide-react';

const T = {
  ink: '#101828', secondary: '#344054', muted: '#667085', mutedLight: '#98A2B3',
  surface: '#FFFFFF', bg: '#F6F8F7', border: '#E4E7EC', borderSubtle: '#F2F4F7',
  brand: '#10B981', brandDark: '#047857', brandSubtle: '#ECFDF5',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  savings: Landmark, current: Building2, credit: CreditCard, default: Wallet,
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/accounts').then(({ data }) => setAccounts(data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + Number(a.balance), 0);

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>Accounts</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>Manage your bank accounts, cards, and cash.</p>
        </div>
        <button className="flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: T.brandDark, boxShadow: '0 1px 3px rgba(4,120,87,0.3)' }}>
          <Plus size={14} strokeWidth={2.5} /> Add Account
        </button>
      </div>

      {/* Total Balance */}
      <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: T.ink }}>
        <p className="text-[12px] font-medium mb-1" style={{ color: T.mutedLight }}>Total Balance</p>
        <h2 className="text-[32px] font-bold text-white tracking-tight">{fmt(totalBalance)}</h2>
        <p className="text-[12px] mt-1" style={{ color: '#475467' }}>
          {accounts.length} account{accounts.length !== 1 ? 's' : ''}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1,2,3].map(i => <div key={i} className="h-36 rounded-xl animate-pulse" style={{ backgroundColor: T.borderSubtle }} />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: T.brandSubtle }}>
            <Wallet size={24} style={{ color: T.brand }} />
          </div>
          <h3 className="text-[16px] font-bold mb-1" style={{ color: T.ink }}>No accounts yet</h3>
          <p className="text-[13px] mb-5" style={{ color: T.muted }}>Add your first account to start tracking your finances.</p>
          <button className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
            style={{ backgroundColor: T.brandDark }}>
            <Plus size={14} /> Add Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {accounts.map((acc) => {
            const Icon = ACCOUNT_ICONS[acc.type?.toLowerCase()] ?? ACCOUNT_ICONS.default;
            return (
              <div key={acc.id} className="rounded-xl p-5 group"
                style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: T.brandSubtle }}>
                      <Icon size={15} style={{ color: T.brand }} />
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-semibold" style={{ color: T.ink }}>{acc.name}</h3>
                      <p className="text-[11px] capitalize" style={{ color: T.mutedLight }}>{acc.type}</p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] mb-1" style={{ color: T.mutedLight }}>Balance</p>
                <p className="text-[20px] font-bold tracking-tight mb-1" style={{ color: T.ink }}>{fmt(Number(acc.balance))}</p>
                <p className="text-[11px] mb-4" style={{ color: T.mutedLight }}>{acc.currency}</p>
                <div className="flex gap-2 pt-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
                  <button className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors"
                    style={{ color: T.muted }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = T.brandSubtle; (e.currentTarget as HTMLElement).style.color = T.brand; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                    <Edit2 size={11} /> Edit
                  </button>
                  <button className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors"
                    style={{ color: T.muted }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FEF3F2'; (e.currentTarget as HTMLElement).style.color = '#F04438'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = T.muted; }}>
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
