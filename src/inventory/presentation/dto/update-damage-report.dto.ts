import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DamageStatus } from '../../domain/damage-report';

export class UpdateDamageReportDto {
  @IsOptional()
  @IsEnum(DamageStatus)
  status?: DamageStatus;

  @IsOptional()
  @IsString()
  resolution?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
