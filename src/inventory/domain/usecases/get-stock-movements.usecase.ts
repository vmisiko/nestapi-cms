import type { Either } from '../../../core/domain/either';
import type { DataError } from '../../../core/domain/data-error';
import type { IStockMovementRepository } from '../i-stock-movement.repository';
import type { StockMovement } from '../stock-movement';

export class GetStockMovementsUseCase {
  constructor(private readonly repo: IStockMovementRepository) {}

  execute(limit?: number): Promise<Either<DataError, StockMovement[]>> {
    return this.repo.findAll(limit);
  }
}
