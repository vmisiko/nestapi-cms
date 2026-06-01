import type {
  IAttendanceSessionRepository,
  UpdateSessionData,
} from '../i-attendance-session.repository';

export class UpdateSessionUseCase {
  constructor(private readonly repo: IAttendanceSessionRepository) {}
  execute(id: string, data: UpdateSessionData) {
    return this.repo.update(id, data);
  }
}
