import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { FollowUpPriority } from '../../domain/follow-up';

export class CreateFollowUpDto {
  @IsUUID()
  memberId: string;

  @IsOptional()
  @IsUUID()
  ownerId?: string | null;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsDateString()
  dueDate: string;

  @IsOptional()
  @IsEnum(FollowUpPriority)
  priority?: FollowUpPriority;
}
