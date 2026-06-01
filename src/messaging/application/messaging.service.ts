import { Injectable } from '@nestjs/common';
import { MessageRepository } from '../infrastructure/message.repository';
import { CreateMessageUseCase } from '../domain/usecases/create-message.usecase';
import { GetMessagesUseCase } from '../domain/usecases/get-messages.usecase';
import { GetMessageByIdUseCase } from '../domain/usecases/get-message-by-id.usecase';
import { UpdateMessageUseCase } from '../domain/usecases/update-message.usecase';
import { DeleteMessageUseCase } from '../domain/usecases/delete-message.usecase';
import { SendMessageUseCase } from '../domain/usecases/send-message.usecase';
import type { CreateMessageDto } from '../presentation/dto/create-message.dto';
import type { UpdateMessageDto } from '../presentation/dto/update-message.dto';
import type { Message } from '../domain/message';
import { toHttpException } from '../../core/application/http-exception.util';

@Injectable()
export class MessagingService {
  private readonly getAllUseCase: GetMessagesUseCase;
  private readonly getByIdUseCase: GetMessageByIdUseCase;
  private readonly createUseCase: CreateMessageUseCase;
  private readonly updateUseCase: UpdateMessageUseCase;
  private readonly deleteUseCase: DeleteMessageUseCase;
  private readonly sendUseCase: SendMessageUseCase;

  constructor(readonly repo: MessageRepository) {
    this.getAllUseCase = new GetMessagesUseCase(repo);
    this.getByIdUseCase = new GetMessageByIdUseCase(repo);
    this.createUseCase = new CreateMessageUseCase(repo);
    this.updateUseCase = new UpdateMessageUseCase(repo);
    this.deleteUseCase = new DeleteMessageUseCase(repo);
    this.sendUseCase = new SendMessageUseCase(repo);
  }

  async findAll(): Promise<Message[]> {
    const result = await this.getAllUseCase.execute();
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async findById(id: string): Promise<Message> {
    const result = await this.getByIdUseCase.execute(id);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async create(dto: CreateMessageDto, createdBy: string): Promise<Message> {
    const result = await this.createUseCase.execute({
      title: dto.title,
      body: dto.body,
      type: dto.type,
      targetGroup: dto.targetGroup,
      targetId: dto.targetId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      createdBy,
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async update(id: string, dto: UpdateMessageDto): Promise<Message> {
    const result = await this.updateUseCase.execute(id, {
      title: dto.title,
      body: dto.body,
      type: dto.type,
      targetGroup: dto.targetGroup,
      targetId: dto.targetId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async send(id: string): Promise<void> {
    const result = await this.sendUseCase.execute(id);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }

  async delete(id: string): Promise<void> {
    const result = await this.deleteUseCase.execute(id);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }
}
