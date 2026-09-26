import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class RecordMemberMilestoneDto {
  @IsUUID()
  milestoneTypeId: string;

  @IsOptional()
  @IsDateString()
  achievedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
