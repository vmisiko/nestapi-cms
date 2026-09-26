import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type {
  CareRecord,
  CareRecordType,
  CareRecordStatus,
} from './care-record';

export interface ICareRecordRepository {
  findByMember(memberId: string): Promise<Either<DataError, CareRecord[]>>;
  create(data: {
    memberId: string;
    type: CareRecordType;
    notes?: string | null;
    handledBy?: string | null;
  }): Promise<Either<DataError, CareRecord>>;
  update(
    id: string,
    data: {
      type?: CareRecordType;
      notes?: string | null;
      status?: CareRecordStatus;
      handledBy?: string | null;
    },
  ): Promise<Either<DataError, CareRecord>>;
}
