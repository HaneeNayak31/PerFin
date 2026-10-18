import { dateRange, monthRange, parseInstant, sqlBounds } from '../../src/utils/dates.js';
import { HttpError } from '../../src/utils/errors.js';

const TZ = 'Asia/Kolkata';

describe('date helpers', () => {
  it('reads a calendar date as midnight in the reporting time zone', () => {
    expect(parseInstant('2026-10-18', TZ).toString()).toBe('2026-10-17T18:30:00Z');
  });

  it('keeps an explicit offset', () => {
    expect(parseInstant('2026-10-18T09:30:00+05:30', TZ).toString()).toBe('2026-10-18T04:00:00Z');
  });

  it.each(['2026-02-30', '2026-13-01', 'yesterday', '2026-10-18T10:00:00'])('rejects %s', (value) => {
    expect(() => parseInstant(value, TZ)).toThrow(HttpError);
  });

  it('makes endDate inclusive by using the start of the next day as an exclusive bound', () => {
    const range = dateRange('2026-10-01', '2026-10-31', TZ);
    expect(range.from?.toString()).toBe('2026-09-30T18:30:00Z');
    expect(range.to?.toString()).toBe('2026-10-31T18:30:00Z');
  });

  it('rejects ranges that end before they start', () => {
    expect(() => dateRange('2026-10-10', '2026-10-01', TZ)).toThrow('startDate must be before endDate');
  });

  it('builds month ranges across year boundaries', () => {
    const { from, to } = monthRange(2026, 12, TZ);
    expect(from.toString()).toBe('2026-11-30T18:30:00Z');
    expect(to.toString()).toBe('2026-12-31T18:30:00Z');
  });

  it('uses infinity for open-ended SQL bounds', () => {
    expect(sqlBounds({ from: null, to: null })).toEqual({ from: '-infinity', to: 'infinity' });
  });
});
