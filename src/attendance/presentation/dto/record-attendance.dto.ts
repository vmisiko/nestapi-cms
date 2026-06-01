import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AttendanceStatus } from '../../domain/attendance-record';

export class RecordAttendanceDto {
  @IsUUID()
  sessionId: string;

  @IsUUID()
  memberId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;

  @IsOptional()
  @IsDateString()
  checkedInAt?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
