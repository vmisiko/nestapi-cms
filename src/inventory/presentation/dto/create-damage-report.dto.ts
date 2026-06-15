import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';
import { DamageType, DamageSeverity } from '../../domain/damage-report';

export class CreateDamageReportDto {
  @IsUUID()
  itemId: string;

  @IsString()
  @MinLength(2)
  reportedByName: string;

  @IsEnum(DamageType)
  damageType: DamageType;

  @IsEnum(DamageSeverity)
  severity: DamageSeverity;

  @IsInt()
  @Min(1)
  quantityAffected: number;

  @IsString()
  @MinLength(5)
  description: string;

  @IsOptional()
  @IsDateString()
  reportDate?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
