import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AttendanceStatus } from '../../domain/attendance-record';

export class UpdateAttendanceRecordDto {
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;

  @IsOptional()
  @IsDateString()
  checkedInAt?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
