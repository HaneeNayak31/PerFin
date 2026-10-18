/**
 * Money values travel through the app as decimal strings (e.g. "1250.50") and
 * all arithmetic happens inside PostgreSQL's exact `numeric` type. These
 * helpers only validate and flip signs; they never convert to a JS number.
 */

/** Up to 12 integer digits and at most 2 decimal places. No rounding is applied. */
const POSITIVE_AMOUNT = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;
const SIGNED_AMOUNT = /^-?(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;

export function isPositiveAmount(value: string): boolean {
  return POSITIVE_AMOUNT.test(value) && !/^0(?:\.0{1,2})?$/.test(value);
}

export function isSignedAmount(value: string): boolean {
  return SIGNED_AMOUNT.test(value);
}

export function negate(amount: string): string {
  if (amount.startsWith('-')) return amount.slice(1);
  return /^0(?:\.0+)?$/.test(amount) ? amount : `-${amount}`;
}

export type TransactionType = 'income' | 'expense';

export const TRANSACTION_TYPES: readonly TransactionType[] = ['income', 'expense'];

/** The change a transaction makes to its account balance. */
export function balanceEffect(type: TransactionType, amount: string): string {
  return type === 'income' ? amount : negate(amount);
}
