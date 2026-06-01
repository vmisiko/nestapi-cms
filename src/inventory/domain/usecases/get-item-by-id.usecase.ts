import type { IInventoryItemRepository } from '../i-inventory-item.repository';

export class GetItemByIdUseCase {
  constructor(private readonly repo: IInventoryItemRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}
