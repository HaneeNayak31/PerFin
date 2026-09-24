"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getOverview, getMonthly, getCategories } from '@/services/analytics';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const T = {
  ink: '#101828', secondary: '#344054', muted: '#667085', mutedLight: '#98A2B3',
  surface: '#FFFFFF', bg: '#F6F8F7', border: '#E4E7EC', borderSubtle: '#F2F4F7',
  brand: '#10B981', income: '#12B76A', expense: '#F04438',
};

const CAT_COLORS = ['#059669', '#475569', '#DC2626', '#D97706', '#7C3AED', '#94A3B8'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: T.ink, borderRadius: '8px', padding: '8px 12px', boxShadow: '0 8px 16px rgba(0,0,0,0.2)' }}>
      <p className="text-[11px] mb-1.5 font-medium" style={{ color: T.mutedLight }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[12px] font-semibold" style={{ color: p.color }}>{p.name}: {fmt(Number(p.value))}</p>
      ))}
    </div>
  );
};

const Card = ({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) => (
  <div className="rounded-xl p-5" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
    <div className="mb-5">
      <h2 className="text-[14px] font-semibold" style={{ color: T.ink }}>{title}</h2>
      <p className="text-[12px] mt-0.5" style={{ color: T.mutedLight }}>{subtitle}</p>
    </div>
    {children}
  </div>
);

const EmptyChart = () => (
  <div className="h-48 flex flex-col items-center justify-center text-center gap-1.5 rounded-lg" style={{ backgroundColor: T.bg }}>
    <p className="text-[13px] font-medium" style={{ color: T.muted }}>No data available</p>
    <p className="text-[12px]" style={{ color: T.mutedLight }}>Add transactions to see analytics</p>
  </div>
);

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getOverview(), getMonthly(), getCategories()])
      .then(([ov, mo, cat]) => { setOverview(ov); setMonthly(mo); setCategories(cat); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>Analytics</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>Insights into your financial health.</p>
        </div>
        <select className="rounded-lg px-3.5 py-2 text-[13px] font-medium outline-none"
          style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, color: T.secondary }}>
          <option>Last 6 Months</option>
          <option>Last 12 Months</option>
          <option>This Year</option>
        </select>
      </div>

      {/* Summary */}
      {!loading && overview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Income', value: overview.totalIncome, color: T.income },
            { label: 'Total Expenses', value: overview.totalExpenses, color: T.expense },
            { label: 'Net Savings', value: overview.savings, color: T.brand },
            { label: 'Transactions', value: overview.numberOfTransactions, raw: true, color: T.ink },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-4" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>{item.label}</p>
              <p className="text-[18px] font-bold tracking-tight" style={{ color: item.color }}>
                {item.raw ? item.value : fmt(Number(item.value))}
              </p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-80 rounded-xl animate-pulse" style={{ backgroundColor: T.borderSubtle }} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Income vs Expenses" subtitle="Monthly comparison">
            {monthly.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid vertical={false} stroke={T.borderSubtle} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: T.mutedLight, fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: T.mutedLight, fontSize: 11 }} tickFormatter={v => `₹${Math.round(v/1000)}k`} width={45} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: T.borderSubtle }} />
                    <Bar dataKey="income" name="Income" fill={T.income} radius={[3,3,0,0]} maxBarSize={24} />
                    <Bar dataKey="expense" name="Expenses" fill={T.expense} radius={[3,3,0,0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart />}
          </Card>

          <Card title="Spending by Category" subtitle="Expense breakdown">
            {categories.length > 0 ? (
              <div className="h-56 flex items-center gap-4">
                <div className="flex-1 h-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categories} cx="50%" cy="50%" innerRadius={60} outerRadius={76} paddingAngle={2} dataKey="amount" nameKey="category" stroke="none">
                        {categories.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmt(Number(v))} contentStyle={{ backgroundColor: T.ink, border: 'none', borderRadius: '8px', color: '#fff', fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 w-32 flex-shrink-0">
                  {categories.slice(0, 5).map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                      <div className="min-w-0">
                        <p className="text-[11.5px] font-medium truncate" style={{ color: T.secondary }}>{c.category}</p>
                        <p className="text-[10.5px]" style={{ color: T.mutedLight }}>{fmt(Number(c.amount))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyChart />}
          </Card>

          <Card title="Monthly Cash Flow" subtitle="Net income trend">
            {monthly.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthly.map(m => ({ ...m, net: Number(m.income) - Number(m.expense) }))}>
                    <CartesianGrid vertical={false} stroke={T.borderSubtle} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: T.mutedLight, fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: T.mutedLight, fontSize: 11 }} tickFormatter={v => `₹${Math.round(v/1000)}k`} width={45} />
                    <Tooltip content={<DarkTooltip />} />
                    <Line type="monotone" dataKey="net" name="Net Flow" stroke={T.brand} strokeWidth={2.5} dot={{ r: 3, fill: T.brand, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart />}
          </Card>

          <Card title="Top Spending" subtitle="Ranked by amount">
            {categories.length > 0 ? (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categories.slice(0, 6)} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid horizontal={false} stroke={T.borderSubtle} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: T.mutedLight, fontSize: 11 }} tickFormatter={v => `₹${Math.round(v/1000)}k`} />
                    <YAxis dataKey="category" type="category" axisLine={false} tickLine={false} tick={{ fill: T.secondary, fontSize: 11 }} width={70} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: T.borderSubtle }} />
                    <Bar dataKey="amount" name="Amount" fill="#475569" radius={[0,3,3,0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyChart />}
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
