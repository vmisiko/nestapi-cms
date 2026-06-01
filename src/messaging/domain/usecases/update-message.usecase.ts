import type {
  IMessageRepository,
  UpdateMessageData,
} from '../i-message.repository';

export class UpdateMessageUseCase {
  constructor(private readonly repo: IMessageRepository) {}
  execute(id: string, data: UpdateMessageData) {
    return this.repo.update(id, data);
  }
}
