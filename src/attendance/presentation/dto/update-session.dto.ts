import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SessionType } from '../../domain/attendance-session';

export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsEnum(SessionType)
  sessionType?: SessionType;

  @IsOptional()
  @IsDateString()
  sessionDate?: string;

  @IsOptional()
  @IsUUID()
  fellowshipId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
