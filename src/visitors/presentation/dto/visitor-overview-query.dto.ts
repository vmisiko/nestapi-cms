import { IsDateString } from 'class-validator';

export class VisitorOverviewQueryDto {
  /** Inclusive start of the range, YYYY-MM-DD. */
  @IsDateString()
  from: string;

  /** Inclusive end of the range, YYYY-MM-DD. */
  @IsDateString()
  to: string;
}
