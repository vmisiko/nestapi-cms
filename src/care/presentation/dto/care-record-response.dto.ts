import { ApiProperty } from '@nestjs/swagger';
import type { CareRecord } from '../../domain/care-record';
import { CareRecordType, CareRecordStatus } from '../../domain/care-record';

export class CareRecordResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty({ enum: CareRecordType })
  type: CareRecordType;

  @ApiProperty({ nullable: true })
  notes: string | null;

  @ApiProperty({ nullable: true })
  handledBy: string | null;

  @ApiProperty({ enum: CareRecordStatus })
  status: CareRecordStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ nullable: true })
  resolvedAt: Date | null;

  constructor(record: CareRecord) {
    this.id = record.id;
    this.memberId = record.memberId;
    this.type = record.type;
    this.notes = record.notes;
    this.handledBy = record.handledBy;
    this.status = record.status;
    this.createdAt = record.createdAt;
    this.updatedAt = record.updatedAt;
    this.resolvedAt = record.resolvedAt;
  }
}
