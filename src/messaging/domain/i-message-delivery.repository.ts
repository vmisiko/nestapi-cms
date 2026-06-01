import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type {
  MessageDelivery,
  DeliveryStatus,
  DeliveryStats,
} from './message-delivery';

export interface CreateDeliveryData {
  messageId: string;
  memberId: string;
  memberName: string;
  phone: string;
  text: string;
}

export interface UpdateDeliveryStatusData {
  status: DeliveryStatus;
  uwaziRef?: string | null;
  failureReason?: string | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
}

export interface IMessageDeliveryRepository {
  createMany(
    data: CreateDeliveryData[],
  ): Promise<Either<DataError, MessageDelivery[]>>;
  findByMessage(
    messageId: string,
  ): Promise<Either<DataError, MessageDelivery[]>>;
  findById(id: string): Promise<Either<DataError, MessageDelivery>>;
  findByUwaziRef(
    ref: string,
  ): Promise<Either<DataError, MessageDelivery | null>>;
  updateStatus(
    id: string,
    data: UpdateDeliveryStatusData,
  ): Promise<Either<DataError, MessageDelivery>>;
  getStats(messageId: string): Promise<Either<DataError, DeliveryStats>>;
}
