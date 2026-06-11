import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageEntity } from './message.entity';
import { MessageStatus } from '../domain/message';
import type {
  IMessageRepository,
  CreateMessageData,
  UpdateMessageData,
} from '../domain/i-message.repository';
import type { Message } from '../domain/message';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class MessageRepository implements IMessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly orm: Repository<MessageEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, Message[]>> {
    try {
      const entities = await this.orm.find({ order: { createdAt: 'DESC' } });
      return Either.right(entities.map(this.toMessage));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch messages'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, Message>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(DataError.notFound(`Message ${id} not found`));
      return Either.right(this.toMessage(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch message'),
      );
    }
  }

  async create(data: CreateMessageData): Promise<Either<DataError, Message>> {
    try {
      const entity = this.orm.create(data as Partial<MessageEntity>);
      const saved = await this.orm.save(entity);
      return Either.right(this.toMessage(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create message'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateMessageData,
  ): Promise<Either<DataError, Message>> {
    try {
      await this.orm.update(id, data as Partial<MessageEntity>);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update message'),
      );
    }
  }

  async markSent(
    id: string,
    sentAt: Date,
  ): Promise<Either<DataError, Message>> {
    try {
      await this.orm.update(id, { status: MessageStatus.SENT, sentAt });
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to send message'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(DataError.notFound(`Message ${id} not found`));
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete message'),
      );
    }
  }

  private toMessage = (e: MessageEntity): Message => ({
    id: e.id,
    title: e.title,
    body: e.body,
    type: e.type,
    targetGroup: e.targetGroup,
    targetId: e.targetId,
    memberIds: e.memberIds ?? [],
    status: e.status,
    scheduledAt: e.scheduledAt,
    sentAt: e.sentAt,
    createdBy: e.createdBy,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
