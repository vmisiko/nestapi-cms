import { ApiProperty } from '@nestjs/swagger';
import type {
  MessageDelivery,
  DeliveryStats,
} from '../../domain/message-delivery';

export class DeliveryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  messageId: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty()
  memberName: string;

  @ApiProperty()
  phone: string;

  @ApiProperty()
  text: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  uwaziRef: string | null;

  @ApiProperty({ nullable: true })
  failureReason: string | null;

  @ApiProperty({ nullable: true })
  sentAt: Date | null;

  @ApiProperty({ nullable: true })
  deliveredAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(d: MessageDelivery) {
    this.id = d.id;
    this.messageId = d.messageId;
    this.memberId = d.memberId;
    this.memberName = d.memberName;
    this.phone = d.phone;
    this.text = d.text;
    this.status = d.status;
    this.uwaziRef = d.uwaziRef;
    this.failureReason = d.failureReason;
    this.sentAt = d.sentAt;
    this.deliveredAt = d.deliveredAt;
    this.createdAt = d.createdAt;
    this.updatedAt = d.updatedAt;
  }
}

export class DeliveryStatsResponseDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  pending: number;

  @ApiProperty()
  sent: number;

  @ApiProperty()
  delivered: number;

  @ApiProperty()
  failed: number;

  constructor(s: DeliveryStats) {
    this.total = s.total;
    this.pending = s.pending;
    this.sent = s.sent;
    this.delivered = s.delivered;
    this.failed = s.failed;
  }
}
