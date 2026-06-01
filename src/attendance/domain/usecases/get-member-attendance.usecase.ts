import type { IAttendanceRecordRepository } from '../i-attendance-record.repository';

export class GetMemberAttendanceUseCase {
  constructor(private readonly repo: IAttendanceRecordRepository) {}
  execute(memberId: string) {
    return this.repo.findByMember(memberId);
  }
}
