import type { AttendanceSession } from '../../domain/attendance-session';

export class SessionResponseDto {
  id: string;
  title: string;
  sessionType: string;
  sessionDate: Date;
  fellowshipId: string | null;
  notes: string | null;
  createdAt: Date;
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
