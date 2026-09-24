"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getBudgets } from '@/services/budgets';
import { Target, Plus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const T = {
  ink: '#101828', secondary: '#344054', muted: '#667085', mutedLight: '#98A2B3',
  surface: '#FFFFFF', bg: '#F6F8F7', border: '#E4E7EC', borderSubtle: '#F2F4F7',
  brand: '#10B981', brandDark: '#047857', brandSubtle: '#ECFDF5',
  income: '#12B76A', expense: '#F04438', warning: '#F79009',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBudgets().then(d => setBudgets(Array.isArray(d) ? d : [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const totalBudgeted = budgets.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent ?? 0), 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPct = totalBudgeted > 0 ? Math.min(100, (totalSpent / totalBudgeted) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>Budgets</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>Track and manage your monthly spending limits.</p>
        </div>
        <button className="flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: T.brandDark, boxShadow: '0 1px 3px rgba(4,120,87,0.3)' }}>
          <Plus size={14} strokeWidth={2.5} /> Add Budget
        </button>
      </div>

      {/* Summary */}
      {!loading && budgets.length > 0 && (
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>Total Budgeted</p>
              <p className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>{fmt(totalBudgeted)}</p>
            </div>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>Total Spent</p>
              <p className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>{fmt(totalSpent)}</p>
            </div>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>Remaining</p>
              <p className="text-[22px] font-bold tracking-tight"
                style={{ color: totalRemaining >= 0 ? T.income : T.expense }}>{fmt(totalRemaining)}</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[12px] mb-1.5" style={{ color: T.mutedLight }}>
              <span>Overall</span>
              <span className="font-medium" style={{ color: T.secondary }}>{overallPct.toFixed(0)}%</span>
            </div>
            <div className="w-full rounded-full h-2 overflow-hidden" style={{ backgroundColor: T.borderSubtle }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(overallPct, 100)}%`, backgroundColor: overallPct > 100 ? T.expense : overallPct > 80 ? T.warning : T.income }} />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: T.borderSubtle }} />)}
        </div>
      ) : budgets.length === 0 ? (
        <div className="rounded-xl p-14 text-center" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: T.brandSubtle }}>
            <Target size={24} style={{ color: T.brand }} />
          </div>
          <h3 className="text-[16px] font-bold mb-1" style={{ color: T.ink }}>No budgets yet</h3>
          <p className="text-[13px] mb-5" style={{ color: T.muted }}>Set spending limits by category to stay on track.</p>
          <button className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
            style={{ backgroundColor: T.brandDark }}>
            <Plus size={14} /> Add Budget
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b, i) => {
            const spent = Number(b.spent ?? 0);
            const amount = Number(b.amount);
            const remaining = amount - spent;
            const pct = amount > 0 ? Math.min(100, (spent / amount) * 100) : 0;
            const isOver = pct >= 100;
            const isWarn = pct >= 80 && !isOver;
            const StatusIcon = isOver ? XCircle : isWarn ? AlertTriangle : CheckCircle;
            const statusColor = isOver ? T.expense : isWarn ? T.warning : T.income;
            const barColor = isOver ? T.expense : isWarn ? T.warning : T.income;
            const label = b.categoryName ?? b.category?.name ?? `Budget ${b.id}`;

            return (
              <div key={i} className="rounded-xl p-5 transition-shadow"
                style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: isOver ? '#FEF3F2' : isWarn ? '#FFFAEB' : T.brandSubtle }}>
                      <Target size={14} style={{ color: statusColor }} />
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-semibold" style={{ color: T.ink }}>{label}</h3>
                      <p className="text-[11px] capitalize" style={{ color: T.mutedLight }}>{b.period ?? 'monthly'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon size={15} style={{ color: statusColor }} />
                    <span className="text-[12px] font-semibold" style={{ color: statusColor }}>{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span style={{ color: T.muted }}>{fmt(spent)} spent</span>
                    <span className="font-medium" style={{ color: remaining >= 0 ? T.secondary : T.expense }}>
                      {remaining >= 0 ? `${fmt(remaining)} left` : `${fmt(-remaining)} over`} of {fmt(amount)}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: T.borderSubtle }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
