import { parseCsv } from '../../src/utils/csv.js';

describe('parseCsv', () => {
  it('handles quoted commas, escaped quotes, CRLF and blank lines', () => {
    const csv = '﻿date,amount,description\r\n2026-10-01,10.00,"Lunch, with ""team"""\r\n\r\n2026-10-02,5,plain\n';
    expect(parseCsv(csv)).toEqual([
      ['date', 'amount', 'description'],
      ['2026-10-01', '10.00', 'Lunch, with "team"'],
      ['2026-10-02', '5', 'plain'],
    ]);
  });

  it('keeps newlines inside quoted cells', () => {
    expect(parseCsv('a,b\n"line1\nline2",x')).toEqual([['a', 'b'], ['line1\nline2', 'x']]);
  });
});
