import type { IInventoryCategoryRepository } from '../i-inventory-category.repository';

export class GetCategoryByIdUseCase {
  constructor(private readonly repo: IInventoryCategoryRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}
