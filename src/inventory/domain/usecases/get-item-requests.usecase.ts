import type { Either } from '../../../core/domain/either';
import type { DataError } from '../../../core/domain/data-error';
import type { IItemRequestRepository } from '../i-item-request.repository';
import type { ItemRequest } from '../item-request';

export class GetItemRequestsUseCase {
  constructor(private readonly repo: IItemRequestRepository) {}

  execute(): Promise<Either<DataError, ItemRequest[]>> {
    return this.repo.findAll();
  }
}
