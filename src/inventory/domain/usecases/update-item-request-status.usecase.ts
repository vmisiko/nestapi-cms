import type { Either } from '../../../core/domain/either';
import type { DataError } from '../../../core/domain/data-error';
import type { IItemRequestRepository } from '../i-item-request.repository';
import type { ItemRequest, ItemRequestStatus } from '../item-request';

export class UpdateItemRequestStatusUseCase {
  constructor(private readonly repo: IItemRequestRepository) {}

  execute(
    id: string,
    status: ItemRequestStatus,
  ): Promise<Either<DataError, ItemRequest>> {
    return this.repo.updateStatus(id, status);
  }
}
