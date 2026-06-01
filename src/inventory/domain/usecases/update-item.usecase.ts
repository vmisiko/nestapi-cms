import type {
  IInventoryItemRepository,
  UpdateItemData,
} from '../i-inventory-item.repository';

export class UpdateItemUseCase {
  constructor(private readonly repo: IInventoryItemRepository) {}
  execute(id: string, data: UpdateItemData) {
    return this.repo.update(id, data);
  }
}
