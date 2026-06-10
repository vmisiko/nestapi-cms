import type { IMessageTemplateRepository } from '../i-message-template.repository';

export class CreateTemplateUseCase {
  constructor(private readonly repo: IMessageTemplateRepository) {}
  execute(data: { name: string; body: string; createdBy: string }) {
    return this.repo.create(data);
  }
}
