import type {
  MessageDelivery,
  DeliveryStats,
} from '../../domain/message-delivery';

export class DeliveryResponseDto {
  id: string;
  messageId: string;
  memberId: string;
  memberName: string;
  phone: string;
  text: string;
  status: string;
  uwaziRef: string | null;
  failureReason: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
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
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;

  constructor(s: DeliveryStats) {
    this.total = s.total;
    this.pending = s.pending;
    this.sent = s.sent;
    this.delivered = s.delivered;
    this.failed = s.failed;
  }
}
