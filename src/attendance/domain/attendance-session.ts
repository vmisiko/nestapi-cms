export enum SessionType {
  SUNDAY_SERVICE = 'sunday_service',
  MIDWEEK_SERVICE = 'midweek_service',
  FELLOWSHIP = 'fellowship',
  SPECIAL_EVENT = 'special_event',
}

export interface AttendanceSession {
  id: string;
  title: string;
  sessionType: SessionType;
  sessionDate: Date;
  fellowshipId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
