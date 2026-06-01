import type { IAttendanceSessionRepository } from '../i-attendance-session.repository';

export class GetSessionByIdUseCase {
  constructor(private readonly repo: IAttendanceSessionRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}
