import { Transform } from 'class-transformer';
import { registerDecorator, type ValidationOptions } from 'class-validator';
import { isPositiveAmount, isSignedAmount } from '../utils/money.js';

/**
 * JSON clients may send money as a number (12.5) or a string ("12.50").
 * Numbers are converted with String(), so 0.1 + 0.2 arrives as
 * "0.30000000000000004" and is rejected instead of silently rounded.
 */
export const ToAmountString = () =>
  Transform(({ value }) => (typeof value === 'number' ? String(value) : value));

/** Trims strings; turns empty strings into undefined so optional fields stay optional. */
export const TrimmedOptional = () =>
  Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  });

export const Trimmed = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

function amountDecorator(check: (value: string) => boolean, description: string) {
  return (options?: ValidationOptions) => (target: object, propertyName: string) => {
    registerDecorator({
      name: 'isAmount',
      target: target.constructor,
      propertyName,
      options: { message: `${propertyName} ${description}`, ...options },
      validator: {
        validate: (value: unknown) => typeof value === 'string' && check(value),
      },
    });
  };
}

export const IsPositiveAmount = amountDecorator(
  isPositiveAmount,
  'must be a positive amount with at most 2 decimal places (e.g. "1250.50")',
);

export const IsSignedAmount = amountDecorator(
  isSignedAmount,
  'must be an amount with at most 2 decimal places (e.g. "-20.00" or "1500")',
);
