import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { ItemRequest, ItemRequestStatus } from './item-request';

export interface CreateItemRequestData {
  requester: string;
  requesterAvatar: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason?: string | null;
  requestDate: string;
  returnDate: string;
}

export interface IItemRequestRepository {
  findAll(): Promise<Either<DataError, ItemRequest[]>>;
  findById(id: string): Promise<Either<DataError, ItemRequest>>;
  create(data: CreateItemRequestData): Promise<Either<DataError, ItemRequest>>;
  updateStatus(
    id: string,
    status: ItemRequestStatus,
  ): Promise<Either<DataError, ItemRequest>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
