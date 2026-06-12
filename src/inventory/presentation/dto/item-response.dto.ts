import { ApiProperty } from '@nestjs/swagger';
import type { InventoryItem, ItemCondition } from '../../domain/inventory-item';

export class ItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  totalQty: number;

  @ApiProperty()
  availableQty: number;

  @ApiProperty({ nullable: true, enum: ['excellent', 'good', 'fair', 'poor'] })
  condition: ItemCondition | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(i: InventoryItem) {
    this.id = i.id;
    this.name = i.name;
    this.code = i.code;
    this.categoryId = i.categoryId;
    this.totalQty = i.totalQty;
    this.availableQty = i.availableQty;
    this.condition = i.condition;
    this.createdAt = i.createdAt;
    this.updatedAt = i.updatedAt;
  }
}
