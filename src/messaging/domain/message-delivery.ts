export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export interface MessageDelivery {
  id: string;
  messageId: string;
  memberId: string;
  memberName: string;
  phone: string;
  text: string;
  status: DeliveryStatus;
  uwaziRef: string | null;
  failureReason: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
}
