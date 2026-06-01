import type {
  IAttendanceSessionRepository,
  CreateSessionData,
} from '../i-attendance-session.repository';

export class CreateSessionUseCase {
  constructor(private readonly repo: IAttendanceSessionRepository) {}
  execute(data: CreateSessionData) {
    return this.repo.create(data);
  }
}
