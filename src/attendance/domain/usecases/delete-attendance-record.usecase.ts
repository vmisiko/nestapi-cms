import type { IAttendanceRecordRepository } from '../i-attendance-record.repository';

export class DeleteAttendanceRecordUseCase {
  constructor(private readonly repo: IAttendanceRecordRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
