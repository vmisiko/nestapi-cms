import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import {
  FOLLOW_UP_FILTERS,
  FollowUpFilter,
  GENDER_FILTERS,
  GenderFilter,
  LIFECYCLES,
  Lifecycle,
  STAY_FILTERS,
  StayFilter,
} from '../../application/visitor-facts.sql';

/** The date range plus the four filters shared by every report screen. */
export class VisitorReportQueryDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;

  @IsOptional()
  @IsIn(LIFECYCLES)
  visitorStatus?: Lifecycle;

  @IsOptional()
  @IsIn(GENDER_FILTERS)
  gender?: GenderFilter;

  @IsOptional()
  @IsIn(STAY_FILTERS)
  stayType?: StayFilter;

  @IsOptional()
  @IsIn(FOLLOW_UP_FILTERS)
  followUpStatus?: FollowUpFilter;

  /** Rows to return; the screens preview 50 and export asks for the full set. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20000)
  limit?: number;
}

export class VisitorSearchQueryDto {
  @IsOptional()
  q?: string;

  @IsOptional()
  @IsIn(['auto', 'name', 'phone', 'id'])
  mode?: 'auto' | 'name' | 'phone' | 'id';

  @IsOptional()
  @IsDateString()
  registeredOn?: string;
}
