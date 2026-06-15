import type { Either } from '../../../core/domain/either';
import type { DataError } from '../../../core/domain/data-error';
import type {
  IItemRequestRepository,
  CreateItemRequestData,
} from '../i-item-request.repository';
import type { ItemRequest } from '../item-request';

export class CreateItemRequestUseCase {
  constructor(private readonly repo: IItemRequestRepository) {}

  execute(
    data: CreateItemRequestData,
  ): Promise<Either<DataError, ItemRequest>> {
    return this.repo.create(data);
  }
}
