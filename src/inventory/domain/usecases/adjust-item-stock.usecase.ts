import { DataError } from '../../../core/domain/data-error';
import { Either } from '../../../core/domain/either';
import type { IInventoryItemRepository } from '../i-inventory-item.repository';
import type { InventoryItem } from '../inventory-item';

export class AdjustItemStockUseCase {
  constructor(private readonly repo: IInventoryItemRepository) {}

  async execute(
    id: string,
    delta: number,
  ): Promise<Either<DataError, InventoryItem>> {
    const found = await this.repo.findById(id);
    if (found.isLeft()) return found;

    const item = found.getOrElse(null as unknown as InventoryItem);
    if (item.availableQty + delta < 0) {
      return Either.left(DataError.businessRule('Stock cannot go below zero'));
    }
    return this.repo.adjustStock(id, delta);
  }
}
