import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateDamageReportDto {
  @IsUUID()
  itemId: string;

  @IsInt()
  @Min(1)
  quantityDamaged: number;

  @IsString()
  @MinLength(5)
  description: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
