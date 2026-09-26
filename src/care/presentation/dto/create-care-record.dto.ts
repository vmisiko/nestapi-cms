import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CareRecordType } from '../../domain/care-record';

export class CreateCareRecordDto {
  @IsEnum(CareRecordType)
  type: CareRecordType;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
