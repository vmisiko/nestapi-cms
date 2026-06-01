import type { AttendanceRecord } from '../../domain/attendance-record';

export class AttendanceRecordResponseDto {
  id: string;
  sessionId: string;
  memberId: string;
  status: string;
  checkedInAt: Date | null;
  notes: string | null;
  createdAt: Date;
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
