import { parseDto } from '../../src/middleware/validate.middleware.js';
import { HttpError } from '../../src/utils/errors.js';
import { CreateTransactionDto, RegisterDto, UpdateAccountDto } from '../../src/validation/dtos.js';

const base = { accountId: 1, amount: '10.50', type: 'expense', date: '2026-10-18' };

async function validationErrors(dto: Parameters<typeof parseDto>[0], input: unknown): Promise<string[]> {
  try {
    await parseDto(dto, input);
    return [];
  } catch (error) {
    if (error instanceof HttpError && Array.isArray(error.details)) return error.details as string[];
    throw error;
  }
}

describe('request validation', () => {
  it('accepts a valid transaction and converts a numeric amount to a string', async () => {
    const dto = await parseDto(CreateTransactionDto, { ...base, amount: 12.5 });
    expect(dto.amount).toBe('12.5');
  });

  it.each([
    ['zero', 0],
    ['negative', '-5'],
    ['too many decimals', '1.234'],
    ['float noise', 0.1 + 0.2],
    ['not a number', 'abc'],
    ['NaN', 'NaN'],
    ['Infinity', 'Infinity'],
    ['exponent', 1e21],
  ])('rejects %s amounts', async (_label, amount) => {
    const errors = await validationErrors(CreateTransactionDto, { ...base, amount });
    expect(errors.join()).toContain('amount must be a positive amount');
  });

  it('rejects unsupported transaction types', async () => {
    const errors = await validationErrors(CreateTransactionDto, { ...base, type: 'transfer' });
    expect(errors).toContain('type must be either income or expense');
  });

  it('rejects fields the API does not accept, such as a userId', async () => {
    const errors = await validationErrors(CreateTransactionDto, { ...base, userId: 99 });
    expect(errors.join()).toContain('property userId should not exist');
  });

  it('rejects invalid dates', async () => {
    const errors = await validationErrors(CreateTransactionDto, { ...base, date: '18/10/2026' });
    expect(errors.join()).toContain('date must be a date');
  });

  it('does not allow editing an account balance directly', async () => {
    const errors = await validationErrors(UpdateAccountDto, { balance: '1000000' });
    expect(errors.join()).toContain('property balance should not exist');
  });

  it('normalises registration emails and enforces password length', async () => {
    const dto = await parseDto(RegisterDto, { email: '  Hanee@Example.COM ', password: 'password1', name: 'Hanee' });
    expect(dto.email).toBe('hanee@example.com');
    const errors = await validationErrors(RegisterDto, { email: 'a@b.co', password: 'short', name: 'Hanee' });
    expect(errors).toContain('password must be at least 8 characters');
  });

  it('rejects a body that is not an object', async () => {
    await expect(parseDto(CreateTransactionDto, ['not', 'an', 'object'])).rejects.toThrow('JSON object');
  });
});
