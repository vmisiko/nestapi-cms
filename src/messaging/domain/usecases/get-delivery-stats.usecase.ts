import type { IMessageDeliveryRepository } from '../i-message-delivery.repository';

export class GetDeliveryStatsUseCase {
  constructor(private readonly repo: IMessageDeliveryRepository) {}
  execute(messageId: string) {
    return this.repo.getStats(messageId);
  }
}
