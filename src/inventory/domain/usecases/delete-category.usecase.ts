import type { IInventoryCategoryRepository } from '../i-inventory-category.repository';

export class DeleteCategoryUseCase {
  constructor(private readonly repo: IInventoryCategoryRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
