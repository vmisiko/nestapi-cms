import type { IMessageRepository } from '../i-message.repository';

export class GetMessageByIdUseCase {
  constructor(private readonly repo: IMessageRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}
