export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  EXCUSED = 'excused',
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  memberId: string;
  status: AttendanceStatus;
  checkedInAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
