import type { IAttendanceRecordRepository } from '../i-attendance-record.repository';

export class GetSessionAttendanceUseCase {
  constructor(private readonly repo: IAttendanceRecordRepository) {}
  execute(sessionId: string) {
    return this.repo.findBySession(sessionId);
  }
}
