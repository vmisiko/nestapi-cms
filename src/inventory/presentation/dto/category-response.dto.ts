import type { InventoryCategory } from '../../domain/inventory-category';

export class CategoryResponseDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(c: InventoryCategory) {
    this.id = c.id;
    this.name = c.name;
    this.description = c.description;
    this.createdAt = c.createdAt;
    this.updatedAt = c.updatedAt;
  }
}
