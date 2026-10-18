import 'temporal-polyfill/global';
import { badRequest } from './errors.js';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Accepts either a calendar date ("2026-10-18", interpreted as midnight in the
 * reporting time zone) or a full ISO timestamp with an offset
 * ("2026-10-18T09:30:00+05:30" / "...Z").
 */
export function parseInstant(value: string, timeZone: string, field = 'date'): Temporal.Instant {
  try {
    if (DATE_ONLY.test(value)) {
      return Temporal.PlainDate.from(value, { overflow: 'reject' })
        .toZonedDateTime({ timeZone })
        .toInstant();
    }
    return Temporal.Instant.from(value);
  } catch {
    throw badRequest(`${field} must be a valid date (YYYY-MM-DD) or ISO timestamp with an offset`);
  }
}

export interface InstantRange {
  /** Inclusive lower bound, or null for "no lower bound". */
  from: Temporal.Instant | null;
  /** Exclusive upper bound, or null for "no upper bound". */
  to: Temporal.Instant | null;
}

/**
 * Turns user-facing inclusive dates into a half-open range [from, to).
 * `endDate=2026-10-31` includes the whole of 31 October in the reporting zone,
 * which avoids the classic "last day is missing" off-by-one error.
 */
export function dateRange(
  startDate: string | undefined,
  endDate: string | undefined,
  timeZone: string,
): InstantRange {
  const from = startDate ? parseInstant(startDate, timeZone, 'startDate') : null;
  let to: Temporal.Instant | null = null;
  if (endDate) {
    to = DATE_ONLY.test(endDate)
      ? Temporal.PlainDate.from(endDate, { overflow: 'reject' })
          .add({ days: 1 })
          .toZonedDateTime({ timeZone })
          .toInstant()
      : parseInstant(endDate, timeZone, 'endDate');
  }
  if (from && to && Temporal.Instant.compare(from, to) >= 0) {
    throw badRequest('startDate must be before endDate');
  }
  return { from, to };
}

export function monthRange(year: number, month: number, timeZone: string): { from: Temporal.Instant; to: Temporal.Instant } {
  const first = Temporal.PlainDate.from({ year, month, day: 1 });
  return {
    from: first.toZonedDateTime({ timeZone }).toInstant(),
    to: first.add({ months: 1 }).toZonedDateTime({ timeZone }).toInstant(),
  };
}

export function currentYearMonth(timeZone: string): { year: number; month: number } {
  const today = Temporal.Now.plainDateISO(timeZone);
  return { year: today.year, month: today.month };
}

/** ISO strings for SQL parameters; infinity keeps an open-ended range valid SQL. */
export function sqlBounds(range: InstantRange): { from: string; to: string } {
  return {
    from: range.from ? range.from.toString() : '-infinity',
    to: range.to ? range.to.toString() : 'infinity',
  };
}
