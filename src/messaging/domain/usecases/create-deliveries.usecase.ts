import type {
  IMessageDeliveryRepository,
  CreateDeliveryData,
} from '../i-message-delivery.repository';

export class CreateDeliveriesUseCase {
  constructor(private readonly repo: IMessageDeliveryRepository) {}
  execute(data: CreateDeliveryData[]) {
    return this.repo.createMany(data);
  }
}
