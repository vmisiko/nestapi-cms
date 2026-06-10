import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { MessageTemplate } from './message-template';

export interface IMessageTemplateRepository {
  findAll(): Promise<Either<DataError, MessageTemplate[]>>;
  create(data: {
    name: string;
    body: string;
    createdBy: string;
  }): Promise<Either<DataError, MessageTemplate>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
