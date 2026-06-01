import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SessionType } from '../../domain/attendance-session';

export class CreateSessionDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title: string;

  @IsEnum(SessionType)
  sessionType: SessionType;

  @IsDateString()
  sessionDate: string;

  @IsOptional()
  @IsUUID()
  fellowshipId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
