import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageDeliveryEntity } from './message-delivery.entity';
import type {
  IMessageDeliveryRepository,
  CreateDeliveryData,
  UpdateDeliveryStatusData,
} from '../domain/i-message-delivery.repository';
import type {
  MessageDelivery,
  DeliveryStats,
} from '../domain/message-delivery';
import { DeliveryStatus } from '../domain/message-delivery';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class MessageDeliveryRepository implements IMessageDeliveryRepository {
  constructor(
    @InjectRepository(MessageDeliveryEntity)
    private readonly orm: Repository<MessageDeliveryEntity>,
  ) {}

  async createMany(
    data: CreateDeliveryData[],
  ): Promise<Either<DataError, MessageDelivery[]>> {
    try {
      const entities = this.orm.create(
        data.map((d) => ({ ...d, status: DeliveryStatus.PENDING })),
      );
      const saved = await this.orm.save(entities);
      return Either.right(saved.map(this.toDelivery));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create delivery records'),
      );
    }
  }

  async findByMessage(
    messageId: string,
  ): Promise<Either<DataError, MessageDelivery[]>> {
    try {
      const entities = await this.orm.find({
        where: { messageId },
        order: { createdAt: 'ASC' },
      });
      return Either.right(entities.map(this.toDelivery));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch deliveries'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, MessageDelivery>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(DataError.notFound(`Delivery ${id} not found`));
      return Either.right(this.toDelivery(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch delivery'),
      );
    }
  }

  async findByUwaziRef(
    ref: string,
  ): Promise<Either<DataError, MessageDelivery | null>> {
    try {
      const entity = await this.orm.findOne({ where: { uwaziRef: ref } });
      return Either.right(entity ? this.toDelivery(entity) : null);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to find delivery by reference'),
      );
    }
  }

  async updateStatus(
    id: string,
    data: UpdateDeliveryStatusData,
  ): Promise<Either<DataError, MessageDelivery>> {
    try {
      await this.orm.update(id, data);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update delivery status'),
      );
    }
  }

  async getStats(messageId: string): Promise<Either<DataError, DeliveryStats>> {
    try {
      const rows = await this.orm
        .createQueryBuilder('d')
        .select('d.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('d.message_id = :messageId', { messageId })
        .groupBy('d.status')
        .getRawMany<{ status: string; count: string }>();

      const map: Record<string, number> = {};
      let total = 0;
      for (const row of rows) {
        map[row.status] = Number(row.count);
        total += Number(row.count);
      }

      return Either.right({
        total,
        pending: map[DeliveryStatus.PENDING] ?? 0,
        sent: map[DeliveryStatus.SENT] ?? 0,
        delivered: map[DeliveryStatus.DELIVERED] ?? 0,
        failed: map[DeliveryStatus.FAILED] ?? 0,
      });
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to get delivery stats'),
      );
    }
  }

  private toDelivery = (e: MessageDeliveryEntity): MessageDelivery => ({
    id: e.id,
    messageId: e.messageId,
    memberId: e.memberId,
    memberName: e.memberName,
    phone: e.phone,
    text: e.text,
    status: e.status,
    uwaziRef: e.uwaziRef,
    failureReason: e.failureReason,
    sentAt: e.sentAt,
    deliveredAt: e.deliveredAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
