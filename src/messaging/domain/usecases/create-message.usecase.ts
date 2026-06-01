import type {
  IMessageRepository,
  CreateMessageData,
} from '../i-message.repository';

export class CreateMessageUseCase {
  constructor(private readonly repo: IMessageRepository) {}
  execute(data: CreateMessageData) {
    return this.repo.create(data);
  }
}
