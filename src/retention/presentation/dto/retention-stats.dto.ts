import { ApiProperty } from '@nestjs/swagger';

class CohortRetention {
  @ApiProperty() eligible: number;
  @ApiProperty() retained: number;
  @ApiProperty() rate: number;
}

class CohortRetentionBreakdown {
  @ApiProperty({ type: CohortRetention }) d30: CohortRetention;
  @ApiProperty({ type: CohortRetention }) d60: CohortRetention;
  @ApiProperty({ type: CohortRetention }) d90: CohortRetention;
}

class GuestConversion {
  @ApiProperty() total: number;
  @ApiProperty() converted: number;
  @ApiProperty() rate: number;
  @ApiProperty({
    description:
      'Approximation: share of members who joined 30+ days ago and currently have status member/leader. ' +
      'Not a true cohort-transition metric — member status has no change history, so members created ' +
      'directly as member/leader (not converted from guest) are indistinguishable from real conversions.',
  })
  note: string;
}

class FollowUpCompletion {
  @ApiProperty() total: number;
  @ApiProperty() completed: number;
  @ApiProperty() rate: number;
}

class MonthlyTrendPoint {
  @ApiProperty() month: string;
  @ApiProperty() eligible: number;
  @ApiProperty() rate: number;
}

class DepartmentBreakdownRow {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() memberCount: number;
  @ApiProperty() activeCount: number;
}

class FellowshipBreakdownRow {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() memberCount: number;
  @ApiProperty() activeCount: number;
}

export class RetentionStatsDto {
  @ApiProperty({ type: CohortRetentionBreakdown })
  cohortRetention: CohortRetentionBreakdown;
  @ApiProperty({ type: GuestConversion }) guestConversion: GuestConversion;
  @ApiProperty({ type: FollowUpCompletion })
  followUpCompletion: FollowUpCompletion;
  @ApiProperty({ type: [MonthlyTrendPoint] }) trend: MonthlyTrendPoint[];
  @ApiProperty({ type: [DepartmentBreakdownRow], required: false })
  departmentBreakdown?: DepartmentBreakdownRow[];
  @ApiProperty({ type: [FellowshipBreakdownRow], required: false })
  fellowshipBreakdown?: FellowshipBreakdownRow[];
}

export class AtRiskMemberDto {
  @ApiProperty() id: string;
  @ApiProperty() firstName: string;
  @ApiProperty() lastName: string;
  @ApiProperty() status: string;
  @ApiProperty() activityStatus: string;
  @ApiProperty() joinedAt: string;
  @ApiProperty() reason: 'inactive' | 'stale_guest';
}

export class AtRiskMembersResponseDto {
  @ApiProperty({ type: [AtRiskMemberDto] }) data: AtRiskMemberDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
