import type { IMessageRepository } from '../i-message.repository';

export class GetMessagesUseCase {
  constructor(private readonly repo: IMessageRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
