import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ActivityStatus } from '../../../core/domain/enums';

export class FellowshipFiltersDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: string;
}
