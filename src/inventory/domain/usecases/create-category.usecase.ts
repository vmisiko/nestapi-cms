import type {
  IInventoryCategoryRepository,
  CreateCategoryData,
} from '../i-inventory-category.repository';

export class CreateCategoryUseCase {
  constructor(private readonly repo: IInventoryCategoryRepository) {}
  execute(data: CreateCategoryData) {
    return this.repo.create(data);
  }
}
