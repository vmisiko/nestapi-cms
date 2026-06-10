import type {
  IMemberRepository,
  BulkPreviewResponse,
} from '../i-member.repository';
import type { Either } from '../../../core/domain/either';
import type { DataError } from '../../../core/domain/data-error';

export class PreviewBulkImportUseCase {
  constructor(private readonly repo: IMemberRepository) {}

  execute(csvBuffer: Buffer): Promise<Either<DataError, BulkPreviewResponse>> {
    return this.repo.previewBulkImport(csvBuffer);
  }
}
