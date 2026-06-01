import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { Message } from './message';

export interface CreateMessageData {
  title: string;
  body: string;
  type: string;
  targetGroup: string;
  targetId?: string | null;
  scheduledAt?: Date | null;
  createdBy: string;
}

export interface UpdateMessageData {
  title?: string;
  body?: string;
  type?: string;
  targetGroup?: string;
  targetId?: string | null;
  scheduledAt?: Date | null;
}

export interface IMessageRepository {
  findAll(): Promise<Either<DataError, Message[]>>;
  findById(id: string): Promise<Either<DataError, Message>>;
  create(data: CreateMessageData): Promise<Either<DataError, Message>>;
  update(
    id: string,
    data: UpdateMessageData,
  ): Promise<Either<DataError, Message>>;
  markSent(id: string, sentAt: Date): Promise<Either<DataError, Message>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
