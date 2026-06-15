import type { Either } from '../../../core/domain/either';
import type { DataError } from '../../../core/domain/data-error';
import type {
  IStockMovementRepository,
  CreateStockMovementData,
} from '../i-stock-movement.repository';
import type { StockMovement } from '../stock-movement';

export class CreateStockMovementUseCase {
  constructor(private readonly repo: IStockMovementRepository) {}

  execute(
    data: CreateStockMovementData,
  ): Promise<Either<DataError, StockMovement>> {
    return this.repo.create(data);
  }
}
