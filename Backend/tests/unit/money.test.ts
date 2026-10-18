import { balanceEffect, isPositiveAmount, isSignedAmount, negate } from '../../src/utils/money.js';

describe('money helpers', () => {
  it.each(['1', '0.5', '10.05', '999999999999.99', '250.25'])('accepts positive amount %s', (value) => {
    expect(isPositiveAmount(value)).toBe(true);
  });

  it.each(['0', '0.00', '-5', '1.234', 'abc', '', 'NaN', 'Infinity', '1e21', '01', '1,000', ' 5', '1000000000000'])(
    'rejects invalid positive amount %j',
    (value) => {
      expect(isPositiveAmount(value)).toBe(false);
    },
  );

  it('allows negative opening balances but still limits decimals', () => {
    expect(isSignedAmount('-1500.50')).toBe(true);
    expect(isSignedAmount('0')).toBe(true);
    expect(isSignedAmount('-1.001')).toBe(false);
  });

  it('negates without converting to floating point', () => {
    expect(negate('0.10')).toBe('-0.10');
    expect(negate('-999999999999.99')).toBe('999999999999.99');
    expect(negate('0')).toBe('0');
  });

  it('income increases and expense decreases the balance', () => {
    expect(balanceEffect('income', '250.25')).toBe('250.25');
    expect(balanceEffect('expense', '250.25')).toBe('-250.25');
  });
});
