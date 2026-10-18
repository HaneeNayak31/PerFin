"use client";

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { AMOUNT_PATTERN, ErrorBanner, Field, Input, PrimaryButton, SecondaryButton, Select } from '@/components/ui/form';
import { dateInputToIso, toDateInputValue, todayInputValue } from '@/lib/format';
import { apiErrorMessage } from '@/services/api';
import { createTransaction, updateTransaction, type TransactionInput } from '@/services/transactions';
import type { Account, Category, Transaction, TransactionType } from '@/types/api';

interface Props {
  accounts: Account[];
  categories: Category[];
  transaction?: Transaction | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function TransactionForm({ accounts, categories, transaction, onClose, onSaved }: Props) {
  const isEdit = Boolean(transaction);
  const [type, setType] = useState<TransactionType>(transaction?.type ?? 'expense');
  const [accountId, setAccountId] = useState(String(transaction?.accountId ?? accounts[0]?.id ?? ''));
  const [categoryId, setCategoryId] = useState(String(transaction?.categoryId ?? ''));
  const [amount, setAmount] = useState(transaction?.amount ?? '');
  const [date, setDate] = useState(transaction ? toDateInputValue(transaction.date) : todayInputValue());
  const [merchant, setMerchant] = useState(transaction?.merchant ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchingCategories = categories.filter(c => c.type === type);

  const changeType = (next: TransactionType) => {
    setType(next);
    // A category of the other type would be rejected by the API.
    if (!categories.some(c => String(c.id) === categoryId && c.type === next)) setCategoryId('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return; // prevent double submission
    setSaving(true);
    setError(null);
    const input: TransactionInput = {
      type,
      accountId: Number(accountId),
      categoryId: categoryId ? Number(categoryId) : null,
      amount: amount.trim(),
      date: dateInputToIso(date),
      merchant: merchant.trim(),
      description: description.trim(),
    };
    try {
      if (transaction) await updateTransaction(transaction.id, input);
      else await createTransaction(input);
      onSaved();
    } catch (err) {
      setError(apiErrorMessage(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit transaction' : 'Add transaction'} onClose={onClose}>
      {accounts.length === 0 ? (
        <p className="text-[13px]" style={{ color: '#667085' }}>Create an account first on the Accounts page.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <ErrorBanner message={error} />
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map(option => (
              <button key={option} type="button" onClick={() => changeType(option)}
                className="py-2 rounded-lg text-[13px] font-semibold capitalize"
                style={type === option
                  ? { backgroundColor: option === 'income' ? '#ECFDF5' : '#FEF3F2', color: option === 'income' ? '#047857' : '#B42318', border: '1px solid currentColor' }
                  : { backgroundColor: '#F6F8F7', color: '#667085', border: '1px solid #E4E7EC' }}>
                {option}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount">
              <Input required inputMode="decimal" pattern={AMOUNT_PATTERN} title="A positive amount with up to 2 decimals"
                value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Date">
              <Input required type="date" value={date} onChange={e => setDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Account">
            <Select required value={accountId} onChange={e => setAccountId(e.target.value)}>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
            </Select>
          </Field>
          <Field label="Category" hint={matchingCategories.length === 0 ? `No ${type} categories yet. Add them on the Budgets page.` : undefined}>
            <Select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Uncategorized</option>
              {matchingCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
          <Field label="Merchant">
            <Input maxLength={120} value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="e.g. Swiggy" />
          </Field>
          <Field label="Description">
            <Input maxLength={500} value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional note" />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <SecondaryButton type="button" onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add transaction'}</PrimaryButton>
          </div>
        </form>
      )}
    </Modal>
  );
}
