import type { InventoryItem } from '../../domain/inventory-item';

export class ItemResponseDto {
  id: string;
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  minStockLevel: number;
  location: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(i: InventoryItem) {
    this.id = i.id;
    this.name = i.name;
    this.categoryId = i.categoryId;
    this.quantity = i.quantity;
    this.unit = i.unit;
    this.minStockLevel = i.minStockLevel;
    this.location = i.location;
    this.description = i.description;
    this.createdAt = i.createdAt;
    this.updatedAt = i.updatedAt;
  }
}
