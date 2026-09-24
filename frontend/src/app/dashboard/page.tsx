"use client";

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getOverview, getMonthly, getCategories } from '@/services/analytics';
import { getTransactions } from '@/services/transactions';
import { getBudgets } from '@/services/budgets';
import { api } from '@/services/api';
import Link from 'next/link';
import {
  Plus, ChevronRight, TrendingUp, TrendingDown,
  Wallet, PiggyBank, ArrowLeftRight, Target,
  Sparkles, Send, BarChart2, PieChart as PieChartIcon, Upload,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  ink: '#101828',
  secondary: '#344054',
  muted: '#667085',
  mutedLight: '#98A2B3',
  surface: '#FFFFFF',
  bg: '#F6F8F7',
  border: '#E4E7EC',
  borderSubtle: '#F2F4F7',
  brand: '#10B981',
  brandDark: '#047857',
  brandSubtle: '#ECFDF5',
  income: '#12B76A',
  incomeSubtle: '#ECFDF5',
  expense: '#F04438',
  expenseSubtle: '#FEF3F2',
  warning: '#F79009',
  warningSubtle: '#FFFAEB',
  ai: '#7A5AF8',
  aiSubtle: '#F4F3FF',
};

// Mature category palette
const CAT_COLORS = ['#059669', '#475569', '#DC2626', '#D97706', '#7C3AED', '#94A3B8'];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string | Date) => {
  const dt = new Date(d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dt.toDateString() === today.toDateString()) return 'Today';
  if (dt.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Sk = ({ h = 'h-4', w = 'w-full', className = '' }: { h?: string; w?: string; className?: string }) => (
  <div className={`animate-pulse rounded ${h} ${w} ${className}`} style={{ backgroundColor: '#F2F4F7' }} />
);

// ── Card ──────────────────────────────────────────────────────────────────────
const Card = ({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div
    className={className}
    style={{
      backgroundColor: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: '10px',
      boxShadow: '0 1px 3px rgba(16, 24, 40, 0.06), 0 1px 2px rgba(16, 24, 40, 0.04)',
      ...style,
    }}
  >
    {children}
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  title, value, icon: Icon, iconColor, iconBg, loading,
}: {
  title: string; value: string | null;
  icon: React.ElementType; iconColor: string; iconBg: string;
  loading: boolean;
}) {
  return (
    <Card style={{ padding: '16px 20px' }}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[11.5px] font-semibold uppercase tracking-wider" style={{ color: T.muted }}>
          {title}
        </p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
          <Icon size={13} style={{ color: iconColor }} strokeWidth={2.5} />
        </div>
      </div>
      {loading ? (
        <Sk h="h-8" w="w-32" className="mb-2" />
      ) : (
        <p className="text-[26px] font-bold tracking-tight leading-none" style={{ color: T.ink }}>
          {fmt(Number(value ?? 0))}
        </p>
      )}
    </Card>
  );
}

// ── Empty Chart State ─────────────────────────────────────────────────────────
function EmptyChart({ message, subtext, height = 'h-48' }: { message: string; subtext: string; height?: string }) {
  return (
    <div className={`${height} flex flex-col items-center justify-center text-center gap-1.5`}
      style={{ backgroundColor: T.bg, borderRadius: '8px' }}>
      <p className="text-[13px] font-medium" style={{ color: T.muted }}>{message}</p>
      <p className="text-[12px]" style={{ color: T.mutedLight }}>{subtext}</p>
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: T.ink, borderRadius: '8px', padding: '8px 12px',
      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    }}>
      <p className="text-[11px] mb-1.5 font-medium" style={{ color: T.mutedLight }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-[12px] font-semibold" style={{ color: p.color }}>
          {p.name}: {fmt(Number(p.value))}
        </p>
      ))}
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('Welcome');

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');

    Promise.all([
      getOverview(), getMonthly(), getCategories(),
      getTransactions({ limit: 6 }), getBudgets(),
    ]).then(([ov, mo, cat, tx, bg]) => {
      setOverview(ov);
      setMonthly(mo);
      setCategories(cat);
      setTransactions(tx.data ?? []);
      setBudgets(Array.isArray(bg) ? bg : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const sendAi = async (q: string) => {
    if (!q.trim() || aiLoading) return;
    setAiInput('');
    setAiLoading(true);
    setAiResponse('');
    try {
      const { data } = await api.post('/ai/chat', { query: q });
      setAiResponse(typeof data === 'string' ? data : JSON.stringify(data));
    } catch {
      setAiResponse("Couldn't process that. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const totalCatSpend = categories.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <DashboardLayout>
      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight leading-tight" style={{ color: T.ink }}>
            {greeting}, Hanee
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>
            Here's your financial overview for September.
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg transition-all"
          style={{ backgroundColor: T.brandDark, boxShadow: '0 1px 3px rgba(4, 120, 87, 0.3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#065F46'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = T.brandDark; }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Add transaction
        </button>
      </div>

      {/* ── SUMMARY CARDS ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard title="Total Balance" value={overview?.currentBalance}
          icon={Wallet} iconColor={T.brand} iconBg={T.brandSubtle} loading={loading} />
        <StatCard title="Total Income" value={overview?.totalIncome}
          icon={TrendingUp} iconColor={T.income} iconBg={T.incomeSubtle} loading={loading} />
        <StatCard title="Total Expenses" value={overview?.totalExpenses}
          icon={TrendingDown} iconColor={T.expense} iconBg={T.expenseSubtle} loading={loading} />
        <StatCard title="Net Savings" value={overview?.savings}
          icon={PiggyBank} iconColor="#7A5AF8" iconBg="#F4F3FF" loading={loading} />
      </div>

      {/* ── ANALYTICS ROW ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 mb-4">
        {/* Income vs Expenses */}
        <Card style={{ padding: '20px' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: T.ink }}>Income vs Expenses</h2>
              <p className="text-[12px] mt-0.5" style={{ color: T.mutedLight }}>Monthly cash flow</p>
            </div>
            <div className="flex items-center gap-4 text-[11.5px]" style={{ color: T.mutedLight }}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: T.income }} />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: T.expense }} />
                Expenses
              </span>
            </div>
          </div>
          {loading ? (
            <Sk h="h-48" />
          ) : monthly.length === 0 ? (
            <EmptyChart message="No cash flow data yet" subtext="Add transactions to see your monthly income and expenses." />
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} barGap={3} barCategoryGap="35%">
                  <CartesianGrid vertical={false} stroke={T.borderSubtle} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false}
                    tick={{ fill: T.mutedLight, fontSize: 11 }} dy={6} />
                  <YAxis axisLine={false} tickLine={false}
                    tick={{ fill: T.mutedLight, fontSize: 11 }} dx={-4}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} width={45} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: T.borderSubtle, radius: 4 }} />
                  <Bar dataKey="income" name="Income" fill={T.income} radius={[3, 3, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="expense" name="Expenses" fill={T.expense} radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* Spending by Category */}
        <Card style={{ padding: '20px' }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: T.ink }}>By Category</h2>
              <p className="text-[12px] mt-0.5" style={{ color: T.mutedLight }}>Expense breakdown</p>
            </div>
          </div>
          {loading ? (
            <Sk h="h-48" />
          ) : categories.length === 0 ? (
            <EmptyChart message="No spending data" subtext="Add transactions to see your spending breakdown." />
          ) : (
            <div>
              {/* Donut */}
              <div className="h-36 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categories} cx="50%" cy="50%"
                      innerRadius={48} outerRadius={62}
                      paddingAngle={2} dataKey="amount" nameKey="category" stroke="none">
                      {categories.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: any) => fmt(Number(v))}
                      contentStyle={{
                        backgroundColor: T.ink, border: 'none', borderRadius: '8px',
                        fontSize: 12, color: '#fff', boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] font-medium" style={{ color: T.mutedLight }}>Total</span>
                  <span className="text-[14px] font-bold" style={{ color: T.ink }}>{fmt(totalCatSpend)}</span>
                </div>
              </div>
              {/* Legend */}
              <div className="space-y-1.5 mt-2">
                {categories.slice(0, 5).map((c, i) => {
                  const pct = totalCatSpend > 0 ? ((Number(c.amount) / totalCatSpend) * 100).toFixed(0) : '0';
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[i % CAT_COLORS.length] }} />
                        <span className="text-[12px] truncate" style={{ color: T.secondary }}>{c.category}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className="text-[11px]" style={{ color: T.mutedLight }}>{pct}%</span>
                        <span className="text-[12px] font-semibold" style={{ color: T.ink }}>{fmt(Number(c.amount))}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── SECONDARY ROW ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 mb-4">
        {/* Recent Transactions */}
        <Card style={{ padding: '20px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-semibold" style={{ color: T.ink }}>Recent Transactions</h2>
            <Link href="/transactions"
              className="flex items-center gap-0.5 text-[12px] font-medium transition-colors"
              style={{ color: T.brand }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T.brandDark; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = T.brand; }}
            >
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Sk h="h-8" w="w-8" className="rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Sk h="h-3.5" w="w-28" />
                    <Sk h="h-3" w="w-20" />
                  </div>
                  <Sk h="h-4" w="w-16" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-8 flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-1"
                style={{ backgroundColor: T.bg }}>
                <ArrowLeftRight size={20} style={{ color: T.mutedLight }} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: T.secondary }}>No transactions yet</p>
              <p className="text-[12px]" style={{ color: T.mutedLight }}>
                Add your first transaction to start tracking your spending.
              </p>
              <button
                className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-white px-3.5 py-1.5 rounded-lg transition-colors"
                style={{ backgroundColor: T.ink }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1d2939'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = T.ink; }}
              >
                <Plus size={12} strokeWidth={2.5} /> Add Transaction
              </button>
            </div>
          ) : (
            <div style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
              {transactions.map((tx, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-3"
                  style={{ borderBottom: i < transactions.length - 1 ? `1px solid ${T.borderSubtle}` : 'none' }}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                    style={{ backgroundColor: T.bg, color: T.secondary }}
                  >
                    {(tx.merchant || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: T.ink }}>
                      {tx.merchant || tx.description || 'Transaction'}
                    </p>
                    <p className="text-[11px]" style={{ color: T.mutedLight }}>{fmtDate(tx.date)}</p>
                  </div>
                  <span
                    className="text-[13px] font-semibold flex-shrink-0"
                    style={{ color: tx.type === 'income' ? T.income : T.ink }}
                  >
                    {tx.type === 'income' ? '+' : '−'}{fmt(Number(tx.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Budget Progress + Quick Actions */}
        <div className="space-y-4">
          {/* Budget Progress */}
          <Card style={{ padding: '20px' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold" style={{ color: T.ink }}>Budget Progress</h2>
              <Link href="/budgets"
                className="flex items-center gap-0.5 text-[12px] font-medium"
                style={{ color: T.brand }}
              >
                View all <ChevronRight size={13} />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="space-y-1.5">
                    <Sk h="h-3.5" w="w-24" />
                    <Sk h="h-1.5" className="rounded-full" />
                  </div>
                ))}
              </div>
            ) : budgets.length === 0 ? (
              <div className="py-4 flex flex-col items-center text-center gap-1.5">
                <Target size={24} style={{ color: T.mutedLight }} />
                <p className="text-[12.5px] font-medium" style={{ color: T.secondary }}>No budgets created</p>
                <p className="text-[11.5px]" style={{ color: T.mutedLight }}>
                  Set spending limits to stay on track.
                </p>
                <button
                  className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-white px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: T.ink }}
                >
                  <Plus size={11} /> Create Budget
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {budgets.slice(0, 4).map((b, i) => {
                  const spent = Number(b.spent ?? 0);
                  const amount = Number(b.amount);
                  const pct = amount > 0 ? Math.min(100, (spent / amount) * 100) : 0;
                  const barColor = pct >= 100 ? T.expense : pct >= 80 ? T.warning : T.income;
                  const label = b.categoryName ?? b.category?.name ?? `Budget ${b.id}`;
                  return (
                    <div key={i}>
                      <div className="flex justify-between items-baseline mb-1.5">
                        <span className="text-[12.5px] font-medium" style={{ color: T.secondary }}>{label}</span>
                        <span className="text-[11px]" style={{ color: T.mutedLight }}>
                          {fmt(spent)} / {fmt(amount)}
                        </span>
                      </div>
                      <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: T.borderSubtle }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card style={{ padding: '20px' }}>
            <h2 className="text-[14px] font-semibold mb-3" style={{ color: T.ink }}>Quick Actions</h2>
            <div className="space-y-1.5">
              {[
                { label: 'Add Transaction', icon: Plus, color: T.brand, bg: T.brandSubtle },
                { label: 'Add Account', icon: Wallet, color: '#3B82F6', bg: '#EFF6FF' },
                { label: 'Add Budget', icon: Target, color: '#7A5AF8', bg: '#F4F3FF' },
                { label: 'Import CSV', icon: Upload, color: T.warning, bg: T.warningSubtle },
              ].map(({ label, icon: Icon, color, bg }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] font-medium transition-colors text-left"
                  style={{ color, backgroundColor: 'transparent' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = bg; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <Icon size={13} strokeWidth={2.5} style={{ color, flexShrink: 0 }} />
                  {label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── AI PANEL ────────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: '#0D1321',
          border: '1px solid #1d2939',
        }}
      >
        <div className="flex items-start gap-6 flex-wrap lg:flex-nowrap">
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={14} style={{ color: T.ai }} />
              <h2 className="text-[13px] font-semibold text-white">AI Finance Assistant</h2>
              <span
                className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ backgroundColor: 'rgba(122, 90, 248, 0.15)', color: T.ai }}
              >
                Beta
              </span>
            </div>
            <p className="text-[12px] mb-3" style={{ color: '#667085' }}>Ask anything about your finances.</p>
            <div className="flex flex-col gap-1">
              {['How much did I spend this month?', 'Am I on track with my budget?', 'Where did I spend the most?'].map(q => (
                <button
                  key={q}
                  onClick={() => sendAi(q)}
                  className="text-left text-[12px] px-2.5 py-1.5 rounded-md transition-all"
                  style={{ color: '#667085' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = '#D0D5DD'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#667085'; }}
                >
                  → {q}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col gap-3">
            {aiResponse && (
              <div className="px-4 py-3 rounded-lg text-[12.5px] leading-relaxed" style={{ backgroundColor: '#1a2236', color: '#D0D5DD' }}>
                {aiResponse}
              </div>
            )}
            {aiLoading && (
              <div className="px-4 py-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: '#1a2236' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: T.ai, animationDelay: `${i * 120}ms` }} />
                ))}
              </div>
            )}
            <div className="relative">
              <input
                type="text"
                value={aiInput}
                onChange={e => setAiInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendAi(aiInput)}
                placeholder="Ask about your finances…"
                className="w-full pl-3.5 pr-10 py-2.5 text-[12.5px] transition-colors outline-none rounded-lg"
                style={{
                  backgroundColor: '#1a2236',
                  border: '1px solid #344054',
                  color: 'white',
                }}
                onFocus={e => { (e.currentTarget as HTMLElement).style.borderColor = T.ai; }}
                onBlur={e => { (e.currentTarget as HTMLElement).style.borderColor = '#344054'; }}
              />
              <button
                onClick={() => sendAi(aiInput)}
                disabled={!aiInput.trim() || aiLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all disabled:opacity-30"
                style={{ color: T.ai }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(122,90,248,0.1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
