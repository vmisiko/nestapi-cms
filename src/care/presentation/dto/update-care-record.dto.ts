import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CareRecordType, CareRecordStatus } from '../../domain/care-record';

export class UpdateCareRecordDto {
  @IsOptional()
  @IsEnum(CareRecordType)
  type?: CareRecordType;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsEnum(CareRecordStatus)
  status?: CareRecordStatus;
}
