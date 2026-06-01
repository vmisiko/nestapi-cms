import type {
  IInventoryItemRepository,
  CreateItemData,
} from '../i-inventory-item.repository';

export class CreateItemUseCase {
  constructor(private readonly repo: IInventoryItemRepository) {}
  execute(data: CreateItemData) {
    return this.repo.create(data);
  }
}
