import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ActivityStatus } from '../../../core/domain/enums';

export class CreateFellowshipDto {
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @IsUUID()
  zoneId: string;

  @IsOptional()
  @IsUUID()
  leaderId?: string | null;

  @IsString()
  @MinLength(2)
  meetingDay: string;

  @Matches(/^\d{2}:\d{2}$/, { message: 'meetingTime must be HH:MM' })
  meetingTime: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  location: string;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @IsString()
  description?: string | null;
}
