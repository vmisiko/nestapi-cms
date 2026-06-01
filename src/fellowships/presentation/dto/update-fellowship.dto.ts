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

export class UpdateFellowshipDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  leaderId?: string | null;

  @IsOptional()
  @IsString()
  meetingDay?: string;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'meetingTime must be HH:MM' })
  meetingTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @IsString()
  description?: string | null;
}
