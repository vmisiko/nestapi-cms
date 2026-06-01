import type {
  IAttendanceRecordRepository,
  CreateRecordData,
} from '../i-attendance-record.repository';

export class RecordAttendanceUseCase {
  constructor(private readonly repo: IAttendanceRecordRepository) {}
  execute(data: CreateRecordData) {
    return this.repo.create(data);
  }
}
