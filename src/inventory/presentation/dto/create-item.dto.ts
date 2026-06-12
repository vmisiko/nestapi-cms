import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { ItemCondition } from '../../domain/inventory-item';

export class CreateItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  code: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalQty?: number;

  @IsOptional()
  @IsEnum(['excellent', 'good', 'fair', 'poor'])
  condition?: ItemCondition | null;
}
