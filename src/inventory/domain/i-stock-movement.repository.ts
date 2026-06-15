import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { StockMovement, StockMovementType } from './stock-movement';

export interface CreateStockMovementData {
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  reason?: string | null;
  performedBy: string;
}

export interface IStockMovementRepository {
  findAll(limit?: number): Promise<Either<DataError, StockMovement[]>>;
  create(
    data: CreateStockMovementData,
  ): Promise<Either<DataError, StockMovement>>;
}
