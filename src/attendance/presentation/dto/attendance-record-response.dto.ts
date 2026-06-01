import { ApiProperty } from '@nestjs/swagger';
import type { AttendanceRecord } from '../../domain/attendance-record';

export class AttendanceRecordResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sessionId: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  checkedInAt: Date | null;

  @ApiProperty({ nullable: true })
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(r: AttendanceRecord) {
    this.id = r.id;
    this.sessionId = r.sessionId;
    this.memberId = r.memberId;
    this.status = r.status;
    this.checkedInAt = r.checkedInAt;
    this.notes = r.notes;
    this.createdAt = r.createdAt;
    this.updatedAt = r.updatedAt;
  }
}
