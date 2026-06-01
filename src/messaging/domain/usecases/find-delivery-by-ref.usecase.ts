import type { IMessageDeliveryRepository } from '../i-message-delivery.repository';

export class FindDeliveryByRefUseCase {
  constructor(private readonly repo: IMessageDeliveryRepository) {}
  execute(ref: string) {
    return this.repo.findByUwaziRef(ref);
  }
}
