import type { IInventoryItemRepository } from '../i-inventory-item.repository';

export class DeleteItemUseCase {
  constructor(private readonly repo: IInventoryItemRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
