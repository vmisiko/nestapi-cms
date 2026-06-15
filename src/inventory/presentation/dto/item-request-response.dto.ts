import { ApiProperty } from '@nestjs/swagger';
import type { ItemRequest, ItemRequestStatus } from '../../domain/item-request';

export class ItemRequestResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() requester: string;
  @ApiProperty() requesterAvatar: string;
  @ApiProperty() itemId: string;
  @ApiProperty() itemName: string;
  @ApiProperty() quantity: number;
  @ApiProperty({ nullable: true }) reason: string | null;
  @ApiProperty() requestDate: string;
  @ApiProperty() returnDate: string;
  @ApiProperty() status: ItemRequestStatus;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(r: ItemRequest) {
    this.id = r.id;
    this.requester = r.requester;
    this.requesterAvatar = r.requesterAvatar;
    this.itemId = r.itemId;
    this.itemName = r.itemName;
    this.quantity = r.quantity;
    this.reason = r.reason;
    this.requestDate = r.requestDate;
    this.returnDate = r.returnDate;
    this.status = r.status;
    this.createdAt = r.createdAt;
    this.updatedAt = r.updatedAt;
  }
}
