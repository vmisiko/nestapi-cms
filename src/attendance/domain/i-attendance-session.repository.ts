import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { AttendanceSession } from './attendance-session';

export interface CreateSessionData {
  title: string;
  sessionType: string;
  sessionDate: Date;
  fellowshipId?: string | null;
  notes?: string | null;
}

export interface UpdateSessionData {
  title?: string;
  sessionType?: string;
  sessionDate?: Date;
  fellowshipId?: string | null;
  notes?: string | null;
}

export interface IAttendanceSessionRepository {
  findAll(): Promise<Either<DataError, AttendanceSession[]>>;
  findById(id: string): Promise<Either<DataError, AttendanceSession>>;
  create(
    data: CreateSessionData,
  ): Promise<Either<DataError, AttendanceSession>>;
  update(
    id: string,
    data: UpdateSessionData,
  ): Promise<Either<DataError, AttendanceSession>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
