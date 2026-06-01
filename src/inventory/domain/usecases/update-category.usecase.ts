import type {
  IInventoryCategoryRepository,
  UpdateCategoryData,
} from '../i-inventory-category.repository';

export class UpdateCategoryUseCase {
  constructor(private readonly repo: IInventoryCategoryRepository) {}
  execute(id: string, data: UpdateCategoryData) {
    return this.repo.update(id, data);
  }
}
