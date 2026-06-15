import type { Either } from '../../../core/domain/either';
import type { DataError } from '../../../core/domain/data-error';
import type { IItemRequestRepository } from '../i-item-request.repository';

export class DeleteItemRequestUseCase {
  constructor(private readonly repo: IItemRequestRepository) {}

  execute(id: string): Promise<Either<DataError, void>> {
    return this.repo.delete(id);
  }
}
