import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { InventoryItem, ItemCondition } from './inventory-item';

export interface CreateItemData {
  name: string;
  code: string;
  categoryId: string;
  totalQty?: number;
  condition?: ItemCondition | null;
}

export interface UpdateItemData {
  name?: string;
  code?: string;
  categoryId?: string;
  totalQty?: number;
  condition?: ItemCondition | null;
}

export interface IInventoryItemRepository {
  findAll(): Promise<Either<DataError, InventoryItem[]>>;
  findByCategoryId(
    categoryId: string,
  ): Promise<Either<DataError, InventoryItem[]>>;
  findById(id: string): Promise<Either<DataError, InventoryItem>>;
  create(data: CreateItemData): Promise<Either<DataError, InventoryItem>>;
  update(
    id: string,
    data: UpdateItemData,
  ): Promise<Either<DataError, InventoryItem>>;
  adjustStock(
    id: string,
    adjustment: number,
  ): Promise<Either<DataError, InventoryItem>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
