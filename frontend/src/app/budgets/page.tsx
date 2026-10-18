"use client";

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Modal from '@/components/ui/Modal';
import { AMOUNT_PATTERN, ErrorBanner, Field, Input, PrimaryButton, SecondaryButton, Select } from '@/components/ui/form';
import { T } from '@/components/ui/theme';
import { useApiData } from '@/hooks/useApiData';
import { formatMoney } from '@/lib/format';
import { apiErrorMessage } from '@/services/api';
import { createBudget, deleteBudget, getBudgets } from '@/services/budgets';
import { createCategory, deleteCategory, getCategories } from '@/services/categories';
import type { Category, TransactionType } from '@/types/api';
import { Target, Plus, AlertTriangle, CheckCircle, XCircle, Trash2, Tag } from 'lucide-react';

function currentMonthValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function BudgetForm({ categories, year, month, onClose, onSaved }: {
  categories: Category[]; year: number; month: number; onClose: () => void; onSaved: () => void;
}) {
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const [categoryId, setCategoryId] = useState(String(expenseCategories[0]?.id ?? ''));
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await createBudget({ categoryId: Number(categoryId), amount: amount.trim(), year, month });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  };

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <Modal title={`Add budget for ${monthLabel}`} onClose={onClose}>
      {expenseCategories.length === 0 ? (
        <p className="text-[13px]" style={{ color: T.muted }}>Create an expense category first (see Categories below).</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <ErrorBanner message={error} />
          <Field label="Category">
            <Select required value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Monthly limit">
            <Input required inputMode="decimal" pattern={AMOUNT_PATTERN} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add budget'}</PrimaryButton>
          </div>
        </form>
      )}
    </Modal>
  );
}

function CategoriesPanel({ categories, onChanged }: { categories: Category[]; onChanged: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createCategory({ name: name.trim(), type });
      setName('');
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!window.confirm(`Delete the category "${category.name}"?`)) return;
    setError(null);
    try {
      await deleteCategory(category.id);
      onChanged();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  };

  return (
    <div className="rounded-xl p-5 mt-6" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
      <h2 className="text-[14px] font-semibold mb-1 flex items-center gap-1.5" style={{ color: T.ink }}><Tag size={14} /> Categories</h2>
      <p className="text-[12px] mb-4" style={{ color: T.mutedLight }}>Used to group transactions and set budgets.</p>
      <ErrorBanner message={error} />
      <form onSubmit={handleAdd} className="flex flex-wrap gap-2 mb-4">
        <Input aria-label="Category name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="New category name" className="flex-1 min-w-[180px]" style={{ width: 'auto' }} />
        <Select aria-label="Category type" value={type} onChange={e => setType(e.target.value as TransactionType)} style={{ width: 'auto' }}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </Select>
        <PrimaryButton type="submit" disabled={saving}><Plus size={13} /> Add</PrimaryButton>
      </form>
      {categories.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: T.muted }}>No categories yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map(c => (
            <span key={c.id} className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-[12px]"
              style={{ backgroundColor: c.type === 'income' ? T.incomeSubtle : T.bg, color: T.secondary, border: `1px solid ${T.border}` }}>
              {c.name}
              <span className="text-[10px] uppercase" style={{ color: T.mutedLight }}>{c.type}</span>
              <button onClick={() => handleDelete(c)} aria-label={`Delete ${c.name}`} className="p-0.5 rounded-full" style={{ color: T.mutedLight }}>
                <Trash2 size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BudgetsPage() {
  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [year, month] = monthValue.split('-').map(Number);
  const budgets = useApiData(() => getBudgets({ year, month }), monthValue);
  const categories = useApiData(getCategories, 'categories');
  const [formOpen, setFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = budgets.data ?? [];
  const loading = budgets.loading && !budgets.data;
  // Display-only totals for the summary card.
  const totalBudgeted = list.reduce((s, b) => s + Number(b.amount), 0);
  const totalSpent = list.reduce((s, b) => s + Number(b.spent), 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const overallPct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  const handleDelete = async (id: number, label: string) => {
    if (!window.confirm(`Delete the ${label} budget?`)) return;
    setActionError(null);
    try {
      await deleteBudget(id);
      budgets.reload();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-7 gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>Budgets</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>Track and manage your monthly spending limits.</p>
        </div>
        <div className="flex gap-2">
          <input type="month" aria-label="Month" value={monthValue} onChange={e => e.target.value && setMonthValue(e.target.value)}
            className="px-3 py-2 text-[13px] rounded-lg" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, color: T.secondary }} />
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
            style={{ backgroundColor: T.brandDark, boxShadow: '0 1px 3px rgba(4,120,87,0.3)' }}>
            <Plus size={14} strokeWidth={2.5} /> Add Budget
          </button>
        </div>
      </div>

      <ErrorBanner message={actionError ?? budgets.error} />

      {/* Summary */}
      {!loading && list.length > 0 && (
        <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>Total Budgeted</p>
              <p className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>{formatMoney(totalBudgeted)}</p>
            </div>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>Total Spent</p>
              <p className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>{formatMoney(totalSpent)}</p>
            </div>
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-wider mb-1" style={{ color: T.muted }}>Remaining</p>
              <p className="text-[22px] font-bold tracking-tight" style={{ color: totalRemaining >= 0 ? T.income : T.expense }}>{formatMoney(totalRemaining)}</p>
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
          {[1, 2, 3].map(i => <div key={i} className="h-24 rounded-xl animate-pulse" style={{ backgroundColor: T.borderSubtle }} />)}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl p-14 text-center" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: T.brandSubtle }}>
            <Target size={24} style={{ color: T.brand }} />
          </div>
          <h3 className="text-[16px] font-bold mb-1" style={{ color: T.ink }}>No budgets for this month</h3>
          <p className="text-[13px] mb-5" style={{ color: T.muted }}>Set spending limits by category to stay on track.</p>
          <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
            style={{ backgroundColor: T.brandDark }}>
            <Plus size={14} /> Add Budget
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(b => {
            const pct = b.percentageUsed;
            const isOver = pct >= 100;
            const isWarn = pct >= 80 && !isOver;
            const StatusIcon = isOver ? XCircle : isWarn ? AlertTriangle : CheckCircle;
            const statusColor = isOver ? T.expense : isWarn ? T.warning : T.income;
            const overspent = b.remaining.startsWith('-');

            return (
              <div key={b.id} className="rounded-xl p-5 transition-shadow group"
                style={{ backgroundColor: T.surface, border: `1px solid ${T.border}`, boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: isOver ? '#FEF3F2' : isWarn ? '#FFFAEB' : T.brandSubtle }}>
                      <Target size={14} style={{ color: statusColor }} />
                    </div>
                    <div>
                      <h3 className="text-[13.5px] font-semibold" style={{ color: T.ink }}>{b.categoryName}</h3>
                      <p className="text-[11px]" style={{ color: T.mutedLight }}>Monthly</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon size={15} style={{ color: statusColor }} />
                    <span className="text-[12px] font-semibold" style={{ color: statusColor }}>{pct.toFixed(0)}%</span>
                    <button onClick={() => handleDelete(b.id, b.categoryName)} aria-label={`Delete ${b.categoryName} budget`}
                      className="ml-2 p-1 rounded-md opacity-60 group-hover:opacity-100" style={{ color: T.mutedLight }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span style={{ color: T.muted }}>{formatMoney(b.spent)} spent</span>
                    <span className="font-medium" style={{ color: overspent ? T.expense : T.secondary }}>
                      {overspent ? `${formatMoney(b.remaining.slice(1))} over` : `${formatMoney(b.remaining)} left`} of {formatMoney(b.amount)}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ backgroundColor: T.borderSubtle }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: statusColor }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CategoriesPanel categories={categories.data ?? []} onChanged={categories.reload} />

      {formOpen && (
        <BudgetForm categories={categories.data ?? []} year={year} month={month}
          onClose={() => setFormOpen(false)} onSaved={() => { setFormOpen(false); budgets.reload(); }} />
      )}
    </DashboardLayout>
  );
}
