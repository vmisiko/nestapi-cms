import type { IAttendanceSessionRepository } from '../i-attendance-session.repository';

export class DeleteSessionUseCase {
  constructor(private readonly repo: IAttendanceSessionRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
