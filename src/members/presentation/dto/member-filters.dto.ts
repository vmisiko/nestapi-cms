import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MemberStatus, MemberType, ActivityStatus } from '../../domain/member';

export class MemberFiltersDto {
  @IsOptional()
  @IsEnum(MemberStatus)
  status?: MemberStatus;

  @IsOptional()
  @IsUUID()
  fellowshipId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsEnum(MemberType)
  memberType?: MemberType;

  @IsOptional()
  @IsEnum(ActivityStatus)
  activityStatus?: ActivityStatus;

  @IsOptional()
  @IsEnum(['all', 'recently', 'week', 'month'])
  joinDateRange?: 'all' | 'recently' | 'week' | 'month';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
