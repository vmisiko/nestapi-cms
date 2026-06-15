import { ApiProperty } from '@nestjs/swagger';
import type {
  StockMovement,
  StockMovementType,
} from '../../domain/stock-movement';

export class StockMovementResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() itemId: string;
  @ApiProperty() itemName: string;
  @ApiProperty() type: StockMovementType;
  @ApiProperty() quantity: number;
  @ApiProperty({ nullable: true }) reason: string | null;
  @ApiProperty() performedBy: string;
  @ApiProperty() createdAt: Date;

  constructor(m: StockMovement) {
    this.id = m.id;
    this.itemId = m.itemId;
    this.itemName = m.itemName;
    this.type = m.type;
    this.quantity = m.quantity;
    this.reason = m.reason;
    this.performedBy = m.performedBy;
    this.createdAt = m.createdAt;
  }
}
