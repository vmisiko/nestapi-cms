import { ApiProperty } from '@nestjs/swagger';
import type { InventoryCategory } from '../../domain/inventory-category';

export class CategoryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(c: InventoryCategory) {
    this.id = c.id;
    this.name = c.name;
    this.description = c.description;
    this.createdAt = c.createdAt;
    this.updatedAt = c.updatedAt;
  }
}
