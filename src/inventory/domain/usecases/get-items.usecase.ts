import type { IInventoryItemRepository } from '../i-inventory-item.repository';

export class GetItemsUseCase {
  constructor(private readonly repo: IInventoryItemRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
