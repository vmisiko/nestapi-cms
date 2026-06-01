import type { IMessageDeliveryRepository } from '../i-message-delivery.repository';

export class GetMessageDeliveriesUseCase {
  constructor(private readonly repo: IMessageDeliveryRepository) {}
  execute(messageId: string) {
    return this.repo.findByMessage(messageId);
  }
}
