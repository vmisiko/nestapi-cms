import type {
  IMessageDeliveryRepository,
  UpdateDeliveryStatusData,
} from '../i-message-delivery.repository';

export class UpdateDeliveryStatusUseCase {
  constructor(private readonly repo: IMessageDeliveryRepository) {}
  execute(id: string, data: UpdateDeliveryStatusData) {
    return this.repo.updateStatus(id, data);
  }
}
