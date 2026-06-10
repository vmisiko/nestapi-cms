import type { IMessageTemplateRepository } from '../i-message-template.repository';

export class GetTemplatesUseCase {
  constructor(private readonly repo: IMessageTemplateRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
