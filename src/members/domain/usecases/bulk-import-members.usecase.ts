import type {
  IMemberRepository,
  BulkImportRow,
  BulkImportResult,
} from '../i-member.repository';
import type { Either } from '../../../core/domain/either';
import type { DataError } from '../../../core/domain/data-error';

export class BulkImportMembersUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  execute(rows: BulkImportRow[]): Promise<Either<DataError, BulkImportResult>> {
    return this.repo.bulkImport(rows);
  }
}
