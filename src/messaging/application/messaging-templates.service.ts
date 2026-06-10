import { Injectable } from '@nestjs/common';
import { MessageTemplateRepository } from '../infrastructure/message-template.repository';
import { GetTemplatesUseCase } from '../domain/usecases/get-templates.usecase';
import { CreateTemplateUseCase } from '../domain/usecases/create-template.usecase';
import { DeleteTemplateUseCase } from '../domain/usecases/delete-template.usecase';
import type { CreateTemplateDto } from '../presentation/dto/create-template.dto';
import type { MessageTemplate } from '../domain/message-template';
import { toHttpException } from '../../core/application/http-exception.util';

@Injectable()
export class MessagingTemplatesService {
  private readonly getAllUseCase: GetTemplatesUseCase;
  private readonly createUseCase: CreateTemplateUseCase;
  private readonly deleteUseCase: DeleteTemplateUseCase;

  constructor(readonly repo: MessageTemplateRepository) {
    this.getAllUseCase = new GetTemplatesUseCase(repo);
    this.createUseCase = new CreateTemplateUseCase(repo);
    this.deleteUseCase = new DeleteTemplateUseCase(repo);
  }

  async findAll(): Promise<MessageTemplate[]> {
    const result = await this.getAllUseCase.execute();
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async create(
    dto: CreateTemplateDto,
    createdBy: string,
  ): Promise<MessageTemplate> {
    const result = await this.createUseCase.execute({
      name: dto.name,
      body: dto.body,
      createdBy,
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
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
