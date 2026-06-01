import { ApiProperty } from '@nestjs/swagger';
import type { InventoryItem } from '../../domain/inventory-item';

export class ItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  minStockLevel: number;

  @ApiProperty({ nullable: true })
  location: string | null;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
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
