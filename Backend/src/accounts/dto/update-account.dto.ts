import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AccountType } from './create-account.dto.js';

export class UpdateAccountDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @IsOptional()
  @IsString()
  balance?: string;

  @IsOptional()
  @IsString()
  currency?: string;
}
