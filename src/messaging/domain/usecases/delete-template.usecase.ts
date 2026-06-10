import type { IMessageTemplateRepository } from '../i-message-template.repository';

export class DeleteTemplateUseCase {
  constructor(private readonly repo: IMessageTemplateRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
