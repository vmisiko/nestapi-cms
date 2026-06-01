import type { IInventoryCategoryRepository } from '../i-inventory-category.repository';

export class GetCategoriesUseCase {
  constructor(private readonly repo: IInventoryCategoryRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
