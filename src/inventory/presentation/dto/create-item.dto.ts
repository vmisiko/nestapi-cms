import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsUUID()
  categoryId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsString()
  @MaxLength(50)
  unit: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minStockLevel?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;
}
