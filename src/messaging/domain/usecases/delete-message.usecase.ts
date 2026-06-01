import type { IMessageRepository } from '../i-message.repository';

export class DeleteMessageUseCase {
  constructor(private readonly repo: IMessageRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
