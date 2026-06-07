import { Injectable, Logger } from '@nestjs/common';
import { MessageRepository } from '../infrastructure/message.repository';
import { MessageDeliveryRepository } from '../infrastructure/message-delivery.repository';
import { SmsProviderService } from '../infrastructure/sms-provider.service';
import { TargetGroupResolverService } from './target-group-resolver.service';
import { CreateMessageUseCase } from '../domain/usecases/create-message.usecase';
import { GetMessagesUseCase } from '../domain/usecases/get-messages.usecase';
import { GetMessageByIdUseCase } from '../domain/usecases/get-message-by-id.usecase';
import { UpdateMessageUseCase } from '../domain/usecases/update-message.usecase';
import { DeleteMessageUseCase } from '../domain/usecases/delete-message.usecase';
import { CreateDeliveriesUseCase } from '../domain/usecases/create-deliveries.usecase';
import { GetMessageDeliveriesUseCase } from '../domain/usecases/get-message-deliveries.usecase';
import { UpdateDeliveryStatusUseCase } from '../domain/usecases/update-delivery-status.usecase';
import { FindDeliveryByRefUseCase } from '../domain/usecases/find-delivery-by-ref.usecase';
import { GetDeliveryStatsUseCase } from '../domain/usecases/get-delivery-stats.usecase';
import type { CreateMessageDto } from '../presentation/dto/create-message.dto';
import type { UpdateMessageDto } from '../presentation/dto/update-message.dto';
import type { Message } from '../domain/message';
import { MessageStatus } from '../domain/message';
import type {
  MessageDelivery,
  DeliveryStats,
} from '../domain/message-delivery';
import { DeliveryStatus } from '../domain/message-delivery';
import { toHttpException } from '../../core/application/http-exception.util';

export interface SendResult {
  messageId: string;
  totalRecipients: number;
  sent: number;
  failed: number;
  skipped: number;
}

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  private readonly getAllUseCase: GetMessagesUseCase;
  private readonly getByIdUseCase: GetMessageByIdUseCase;
  private readonly createUseCase: CreateMessageUseCase;
  private readonly updateUseCase: UpdateMessageUseCase;
  private readonly deleteUseCase: DeleteMessageUseCase;
  private readonly createDeliveriesUseCase: CreateDeliveriesUseCase;
  private readonly getDeliveriesUseCase: GetMessageDeliveriesUseCase;
  private readonly updateDeliveryUseCase: UpdateDeliveryStatusUseCase;
  private readonly findByRefUseCase: FindDeliveryByRefUseCase;
  private readonly getStatsUseCase: GetDeliveryStatsUseCase;

  constructor(
    readonly repo: MessageRepository,
    readonly deliveryRepo: MessageDeliveryRepository,
    private readonly smsProvider: SmsProviderService,
    private readonly resolver: TargetGroupResolverService,
  ) {
    this.getAllUseCase = new GetMessagesUseCase(repo);
    this.getByIdUseCase = new GetMessageByIdUseCase(repo);
    this.createUseCase = new CreateMessageUseCase(repo);
    this.updateUseCase = new UpdateMessageUseCase(repo);
    this.deleteUseCase = new DeleteMessageUseCase(repo);
    this.createDeliveriesUseCase = new CreateDeliveriesUseCase(deliveryRepo);
    this.getDeliveriesUseCase = new GetMessageDeliveriesUseCase(deliveryRepo);
    this.updateDeliveryUseCase = new UpdateDeliveryStatusUseCase(deliveryRepo);
    this.findByRefUseCase = new FindDeliveryByRefUseCase(deliveryRepo);
    this.getStatsUseCase = new GetDeliveryStatsUseCase(deliveryRepo);
  }

  async findAll(): Promise<Message[]> {
    const result = await this.getAllUseCase.execute();
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async findById(id: string): Promise<Message> {
    const result = await this.getByIdUseCase.execute(id);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async create(dto: CreateMessageDto, createdBy: string): Promise<Message> {
    const result = await this.createUseCase.execute({
      title: dto.title,
      body: dto.body,
      type: dto.type,
      targetGroup: dto.targetGroup,
      targetId: dto.targetId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      createdBy,
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async update(id: string, dto: UpdateMessageDto): Promise<Message> {
    const result = await this.updateUseCase.execute(id, {
      title: dto.title,
      body: dto.body,
      type: dto.type,
      targetGroup: dto.targetGroup,
      targetId: dto.targetId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  /**
   * Full send flow:
   *  1. Validate message (exists, is draft)
   *  2. Resolve target group → recipients with valid phones
   *  3. Persist pending delivery records for each recipient
   *  4. Dispatch to Uwazii in batches
   *  5. Update each delivery record with Uwazii's result (sent / failed)
   *  6. Mark the message itself as sent
   */
  async send(id: string): Promise<SendResult> {
    // 1. Fetch and validate message
    const msgResult = await this.getByIdUseCase.execute(id);
    const message = msgResult.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (m) => m,
    );

    if (message.status === MessageStatus.SENT) {
      throw toHttpException(
        'BusinessRuleError',
        'Message has already been sent',
      );
    }

    // 2. Resolve recipients
    const recipients = await this.resolver.resolve(
      message.targetGroup,
      message.targetId,
    );
    if (recipients.length === 0) {
      throw toHttpException(
        'BusinessRuleError',
        'No active members with valid phone numbers found in the target group',
      );
    }

    // 3. Create pending delivery records
    const deliveryData = recipients.map((r) => ({
      messageId: id,
      memberId: r.memberId,
      memberName: r.memberName,
      phone: r.phone,
      text: message.body,
    }));

    const deliveriesResult =
      await this.createDeliveriesUseCase.execute(deliveryData);
    const deliveries = deliveriesResult.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );

    // 4. Send to Uwazii
    const outbound = recipients.map((r) => ({
      to: r.phone,
      text: message.body,
    }));
    const uwaziResults = await this.smsProvider.sendBatch(outbound);

    // 5. Update each delivery record in parallel
    const now = new Date();
    let sent = 0;
    let failed = 0;

    await Promise.all(
      uwaziResults.map(async (res, idx) => {
        const delivery = deliveries[idx];
        if (!delivery) return;

        if (res.accepted) {
          sent++;
          await this.deliveryRepo.updateStatus(delivery.id, {
            status: DeliveryStatus.SENT,
            uwaziRef: res.ref,
            sentAt: now,
          });
        } else {
          failed++;
          this.logger.warn(`Delivery to ${res.to} failed: ${res.reason}`);
          await this.deliveryRepo.updateStatus(delivery.id, {
            status: DeliveryStatus.FAILED,
            failureReason: res.reason,
          });
        }
      }),
    );

    // 6. Mark message as sent (even if some deliveries failed — the send was dispatched)
    await this.repo.markSent(id, now);

    this.logger.log(
      `Message ${id} dispatched — ${sent} sent, ${failed} failed, ${recipients.length} total`,
    );

    return {
      messageId: id,
      totalRecipients: recipients.length,
      sent,
      failed,
      skipped: recipients.length - uwaziResults.length,
    };
  }

  /**
   * Handle Uwazii DLR (Delivery Report) callback.
   * Looks up the delivery record by the Uwazii reference ID and updates its status.
   */
  async handleDlr(
    ref: string,
    status: 'delivered' | 'failed',
    deliveredAt?: Date,
  ): Promise<void> {
    const found = await this.findByRefUseCase.execute(ref);
    const delivery = found.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );

    if (!delivery) {
      this.logger.warn(`DLR received for unknown Uwazii ref: ${ref}`);
      return;
    }

    await this.deliveryRepo.updateStatus(delivery.id, {
      status:
        status === 'delivered'
          ? DeliveryStatus.DELIVERED
          : DeliveryStatus.FAILED,
      deliveredAt:
        status === 'delivered' ? (deliveredAt ?? new Date()) : undefined,
    });
  }

  async getDeliveries(messageId: string): Promise<MessageDelivery[]> {
    const result = await this.getDeliveriesUseCase.execute(messageId);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async getDeliveryStats(messageId: string): Promise<DeliveryStats> {
    const result = await this.getStatsUseCase.execute(messageId);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async delete(id: string): Promise<void> {
    const result = await this.deleteUseCase.execute(id);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }
}
