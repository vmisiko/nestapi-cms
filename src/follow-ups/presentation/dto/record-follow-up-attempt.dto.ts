import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { FollowUpContactMethod, FollowUpOutcome } from '../../domain/follow-up';

export class RecordFollowUpAttemptDto {
  @IsEnum(FollowUpContactMethod)
  contactMethod: FollowUpContactMethod;

  @IsEnum(FollowUpOutcome)
  outcome: FollowUpOutcome;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsDateString()
  contactedAt?: string;
}
