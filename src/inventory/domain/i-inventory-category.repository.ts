import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { InventoryCategory } from './inventory-category';

export interface CreateCategoryData {
  name: string;
  description?: string | null;
  leaderId?: string | null;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string | null;
  leaderId?: string | null;
}

export interface IInventoryCategoryRepository {
  findAll(): Promise<Either<DataError, InventoryCategory[]>>;
  findById(id: string): Promise<Either<DataError, InventoryCategory>>;
  create(
    data: CreateCategoryData,
  ): Promise<Either<DataError, InventoryCategory>>;
  update(
    id: string,
    data: UpdateCategoryData,
  ): Promise<Either<DataError, InventoryCategory>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
