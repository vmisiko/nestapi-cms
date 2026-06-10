import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplateEntity } from './message-template.entity';
import type { IMessageTemplateRepository } from '../domain/i-message-template.repository';
import type { MessageTemplate } from '../domain/message-template';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class MessageTemplateRepository implements IMessageTemplateRepository {
  constructor(
    @InjectRepository(MessageTemplateEntity)
    private readonly orm: Repository<MessageTemplateEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, MessageTemplate[]>> {
    try {
      const entities = await this.orm.find({ order: { createdAt: 'DESC' } });
      return Either.right(entities.map(this.toTemplate));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch message templates'),
      );
    }
  }

  async create(data: {
    name: string;
    body: string;
    createdBy: string;
  }): Promise<Either<DataError, MessageTemplate>> {
    try {
      const entity = this.orm.create(data as Partial<MessageTemplateEntity>);
      const saved = await this.orm.save(entity);
      return Either.right(this.toTemplate(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create message template'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(
          DataError.notFound(`Message template ${id} not found`),
        );
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete message template'),
      );
    }
  }

  private toTemplate = (e: MessageTemplateEntity): MessageTemplate => ({
    id: e.id,
    name: e.name,
    body: e.body,
    createdBy: e.createdBy,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
