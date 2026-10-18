const moneyFormatters = new Map<string, Intl.NumberFormat>();

/**
 * Formats a money value for display. Decimal strings from the API are passed
 * to Intl as strings, which keeps every digit exact (no float rounding).
 */
export function formatMoney(value: string | number | null | undefined, currency = 'INR'): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 });
    moneyFormatters.set(currency, formatter);
  }
  const amount = value ?? 0;
  return formatter.format(typeof amount === 'string' ? (amount as Intl.StringNumericLiteral) : amount);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** YYYY-MM-DD for <input type="date"> in the browser's local time zone. */
export function toDateInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayInputValue(): string {
  return toDateInputValue(new Date().toISOString());
}

/** Turns "2026-10-05" into midnight local time with an explicit offset, as the API expects. */
export function dateInputToIso(value: string): string {
  const local = new Date(`${value}T00:00:00`);
  const offset = -local.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  return `${value}T00:00:00${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
}
