import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CategoryType } from './create-category.dto.js';

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;
}
