import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { TRANSACTION_TYPES, type TransactionType } from '../utils/money.js';
import {
  IsPositiveAmount,
  IsSignedAmount,
  ToAmountString,
  Trimmed,
  TrimmedOptional,
} from './decorators.js';

export const ACCOUNT_TYPES = ['checking', 'savings', 'cash', 'credit'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type CategoryType = TransactionType;

const DATE_OR_TIMESTAMP = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2}))?$/;
const DATE_MESSAGE = 'must be a date (YYYY-MM-DD) or an ISO timestamp with an offset';
const CURRENCY = /^[A-Z]{3}$/;

// ── Auth ────────────────────────────────────────────────────────────────────

export class RegisterDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email must be a valid email address' })
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @MaxLength(72, { message: 'password must be at most 72 characters' })
  password!: string;

  @Trimmed()
  @IsString()
  @Length(2, 80)
  name!: string;
}

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'email must be a valid email address' })
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password!: string;
}

// ── Accounts ────────────────────────────────────────────────────────────────

export class CreateAccountDto {
  @Trimmed()
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsIn(ACCOUNT_TYPES)
  type!: AccountType;

  /** Opening balance. Afterwards the balance only changes through transactions. */
  @ToAmountString()
  @IsSignedAmount()
  balance!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(CURRENCY, { message: 'currency must be a 3-letter ISO code such as INR' })
  currency?: string;
}

export class UpdateAccountDto {
  @IsOptional()
  @Trimmed()
  @IsString()
  @Length(1, 80)
  name?: string;

  @IsOptional()
  @IsIn(ACCOUNT_TYPES)
  type?: AccountType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(CURRENCY, { message: 'currency must be a 3-letter ISO code such as INR' })
  currency?: string;
}

// ── Categories ──────────────────────────────────────────────────────────────

export class CreateCategoryDto {
  @Trimmed()
  @IsString()
  @Length(1, 60)
  name!: string;

  @IsIn(TRANSACTION_TYPES)
  type!: CategoryType;
}

export class UpdateCategoryDto {
  @IsOptional()
  @Trimmed()
  @IsString()
  @Length(1, 60)
  name?: string;

  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: CategoryType;
}

// ── Transactions ────────────────────────────────────────────────────────────

export class CreateTransactionDto {
  @IsInt()
  @Min(1)
  accountId!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number | null;

  @ToAmountString()
  @IsPositiveAmount()
  amount!: string;

  @IsIn(TRANSACTION_TYPES, { message: 'type must be either income or expense' })
  type!: TransactionType;

  @IsOptional()
  @TrimmedOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @TrimmedOptional()
  @IsString()
  @MaxLength(120)
  merchant?: string;

  @Matches(DATE_OR_TIMESTAMP, { message: `date ${DATE_MESSAGE}` })
  date!: string;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  accountId?: number;

  /** null removes the category; undefined leaves it unchanged. */
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number | null;

  @IsOptional()
  @ToAmountString()
  @IsPositiveAmount()
  amount?: string;

  @IsOptional()
  @IsIn(TRANSACTION_TYPES, { message: 'type must be either income or expense' })
  type?: TransactionType;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  merchant?: string | null;

  @IsOptional()
  @Matches(DATE_OR_TIMESTAMP, { message: `date ${DATE_MESSAGE}` })
  date?: string;
}

// ── Budgets ─────────────────────────────────────────────────────────────────

export class CreateBudgetDto {
  @IsInt()
  @Min(1)
  categoryId!: number;

  @ToAmountString()
  @IsPositiveAmount()
  amount!: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year!: number;
}

export class UpdateBudgetDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number;

  @IsOptional()
  @ToAmountString()
  @IsPositiveAmount()
  amount?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;
}

// ── AI ──────────────────────────────────────────────────────────────────────

export class CategorizeDto {
  @IsOptional()
  @TrimmedOptional()
  @IsString()
  @MaxLength(120)
  merchant?: string;

  @IsOptional()
  @TrimmedOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionType;
}

export class ChatDto {
  @Trimmed()
  @IsString()
  @Length(1, 500, { message: 'query must be between 1 and 500 characters' })
  query!: string;
}
