import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { DamageReportStatus } from '../../domain/damage-report';

export class UpdateDamageReportDto {
  @IsOptional()
  @IsEnum(DamageReportStatus)
  status?: DamageReportStatus;

  @IsOptional()
  @IsDateString()
  resolvedAt?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
