import type { IAttendanceSessionRepository } from '../i-attendance-session.repository';

export class GetSessionsUseCase {
  constructor(private readonly repo: IAttendanceSessionRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
