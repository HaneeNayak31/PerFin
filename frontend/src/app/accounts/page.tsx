"use client";

import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Modal from '@/components/ui/Modal';
import { ErrorBanner, Field, Input, PrimaryButton, SecondaryButton, Select, SIGNED_AMOUNT_PATTERN } from '@/components/ui/form';
import { T } from '@/components/ui/theme';
import { useApiData } from '@/hooks/useApiData';
import { formatMoney } from '@/lib/format';
import { createAccount, deleteAccount, getAccounts, updateAccount } from '@/services/accounts';
import { apiErrorMessage } from '@/services/api';
import type { Account, AccountType } from '@/types/api';
import { Plus, CreditCard, Wallet, Landmark, Building2, Edit2, Trash2 } from 'lucide-react';

const ACCOUNT_ICONS: Record<AccountType, React.ElementType> = {
  savings: Landmark, checking: Building2, credit: CreditCard, cash: Wallet,
};

const ACCOUNT_TYPES: AccountType[] = ['savings', 'checking', 'cash', 'credit'];

function AccountForm({ account, onClose, onSaved }: { account: Account | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'savings');
  const [currency, setCurrency] = useState(account?.currency ?? 'INR');
  const [balance, setBalance] = useState('0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      if (account) await updateAccount(account.id, { name: name.trim(), type, currency: currency.trim() });
      else await createAccount({ name: name.trim(), type, currency: currency.trim(), balance: balance.trim() });
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={account ? 'Edit account' : 'Add account'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <ErrorBanner message={error} />
        <Field label="Name">
          <Input required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HDFC Savings" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type">
            <Select value={type} onChange={e => setType(e.target.value as AccountType)}>
              {ACCOUNT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </Select>
          </Field>
          <Field label="Currency">
            <Input required pattern="[A-Za-z]{3}" maxLength={3} value={currency} onChange={e => setCurrency(e.target.value.toUpperCase())} />
          </Field>
        </div>
        {account ? (
          <p className="text-[12px]" style={{ color: T.mutedLight }}>
            The balance changes only through transactions, so it always matches your history.
          </p>
        ) : (
          <Field label="Opening balance" hint="Credit cards can start negative. Later changes come from transactions.">
            <Input required inputMode="decimal" pattern={SIGNED_AMOUNT_PATTERN} title="An amount with up to 2 decimals"
              value={balance} onChange={e => setBalance(e.target.value)} />
          </Field>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : account ? 'Save changes' : 'Add account'}</PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default function AccountsPage() {
  const accounts = useApiData(getAccounts, 'accounts');
  const [formAccount, setFormAccount] = useState<Account | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const list = accounts.data ?? [];
  const currencies = new Set(list.map(a => a.currency));
  const singleCurrency = currencies.size <= 1 ? (list[0]?.currency ?? 'INR') : null;
  // Display-only total; the API keeps exact values per account.
  const totalBalance = list.reduce((sum, a) => sum + Number(a.balance), 0);

  const openNew = () => { setFormAccount(null); setFormOpen(true); };

  const handleDelete = async (account: Account) => {
    if (!window.confirm(`Delete the account "${account.name}"?`)) return;
    setActionError(null);
    try {
      await deleteAccount(account.id);
      accounts.reload();
    } catch (err) {
      setActionError(apiErrorMessage(err));
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-end justify-between mb-7">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: T.ink }}>Accounts</h1>
          <p className="text-[13px] mt-0.5" style={{ color: T.muted }}>Manage your bank accounts, cards, and cash.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
          style={{ backgroundColor: T.brandDark, boxShadow: '0 1px 3px rgba(4,120,87,0.3)' }}>
          <Plus size={14} strokeWidth={2.5} /> Add Account
        </button>
      </div>

      {/* Total Balance */}
      <div className="rounded-xl p-5 mb-5" style={{ backgroundColor: T.ink }}>
        <p className="text-[12px] font-medium mb-1" style={{ color: T.mutedLight }}>Total Balance</p>
        <h2 className="text-[32px] font-bold text-white tracking-tight">
          {singleCurrency ? formatMoney(totalBalance, singleCurrency) : 'Multiple currencies'}
        </h2>
        <p className="text-[12px] mt-1" style={{ color: '#475467' }}>
          {list.length} account{list.length !== 1 ? 's' : ''}
        </p>
      </div>

      <ErrorBanner message={actionError ?? accounts.error} />

      {accounts.loading && !accounts.data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-36 rounded-xl animate-pulse" style={{ backgroundColor: T.borderSubtle }} />)}
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-xl p-12 text-center" style={{ backgroundColor: T.surface, border: `1px solid ${T.border}` }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: T.brandSubtle }}>
            <Wallet size={24} style={{ color: T.brand }} />
          </div>
          <h3 className="text-[16px] font-bold mb-1" style={{ color: T.ink }}>No accounts yet</h3>
          <p className="text-[13px] mb-5" style={{ color: T.muted }}>Add your first account to start tracking your finances.</p>
          <button onClick={openNew} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-white px-4 py-2 rounded-lg"
            style={{ backgroundColor: T.brandDark }}>
            <Plus size={14} /> Add Account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map(acc => {
            const Icon = ACCOUNT_ICONS[acc.type] ?? Wallet;
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
                <p className="text-[20px] font-bold tracking-tight mb-1" style={{ color: Number(acc.balance) < 0 ? T.expense : T.ink }}>
                  {formatMoney(acc.balance, acc.currency)}
                </p>
                <p className="text-[11px] mb-4" style={{ color: T.mutedLight }}>{acc.currency}</p>
                <div className="flex gap-2 pt-3 opacity-60 group-hover:opacity-100 focus-within:opacity-100 transition-opacity" style={{ borderTop: `1px solid ${T.borderSubtle}` }}>
                  <button onClick={() => { setFormAccount(acc); setFormOpen(true); }}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md hover:bg-[#ECFDF5]" style={{ color: T.muted }}>
                    <Edit2 size={11} /> Edit
                  </button>
                  <button onClick={() => handleDelete(acc)}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md hover:bg-[#FEF3F2]" style={{ color: T.muted }}>
                    <Trash2 size={11} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {formOpen && (
        <AccountForm account={formAccount} onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); accounts.reload(); }} />
      )}
    </DashboardLayout>
  );
}
