import type {
  IAttendanceRecordRepository,
  UpdateRecordData,
} from '../i-attendance-record.repository';

export class UpdateAttendanceRecordUseCase {
  constructor(private readonly repo: IAttendanceRecordRepository) {}
  execute(id: string, data: UpdateRecordData) {
    return this.repo.update(id, data);
  }
}
