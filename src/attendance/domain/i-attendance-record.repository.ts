import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { AttendanceRecord } from './attendance-record';

export interface CreateRecordData {
  sessionId: string;
  memberId: string;
  status: string;
  checkedInAt?: Date | null;
  notes?: string | null;
}

export interface UpdateRecordData {
  status?: string;
  checkedInAt?: Date | null;
  notes?: string | null;
}

export interface IAttendanceRecordRepository {
  findBySession(
    sessionId: string,
  ): Promise<Either<DataError, AttendanceRecord[]>>;
  findByMember(
    memberId: string,
  ): Promise<Either<DataError, AttendanceRecord[]>>;
  findById(id: string): Promise<Either<DataError, AttendanceRecord>>;
  create(data: CreateRecordData): Promise<Either<DataError, AttendanceRecord>>;
  update(
    id: string,
    data: UpdateRecordData,
  ): Promise<Either<DataError, AttendanceRecord>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
