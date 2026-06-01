import { ApiProperty } from '@nestjs/swagger';
import type { AttendanceSession } from '../../domain/attendance-session';

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  sessionType: string;

  @ApiProperty()
  sessionDate: Date;

  @ApiProperty({ nullable: true })
  fellowshipId: string | null;

  @ApiProperty({ nullable: true })
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(s: AttendanceSession) {
    this.id = s.id;
    this.title = s.title;
    this.sessionType = s.sessionType;
    this.sessionDate = s.sessionDate;
    this.fellowshipId = s.fellowshipId;
    this.notes = s.notes;
    this.createdAt = s.createdAt;
    this.updatedAt = s.updatedAt;
  }
}
