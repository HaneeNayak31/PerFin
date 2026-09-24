import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBudgetDto {
  @IsNumber()
  categoryId: number;

  @IsString()
  amount: string;

  @IsNumber()
  month: number;

  @IsNumber()
  year: number;
}
