import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { MessageEntity } from '../../messaging/infrastructure/message.entity';
import { MessageStatus } from '../../messaging/domain/message';
import { MessagingService } from '../../messaging/application/messaging.service';
import { AutomationRunLogService } from './automation-run-log.service';
import { AutomationTrigger } from '../domain/automation-run';

@Injectable()
export class ScheduledMessageDispatchService {
  private readonly logger = new Logger(ScheduledMessageDispatchService.name);

  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageOrm: Repository<MessageEntity>,
    private readonly messagingService: MessagingService,
    private readonly runLog: AutomationRunLogService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async runDispatch(): Promise<void> {
    await this.runLog.record(AutomationTrigger.SCHEDULED_MESSAGE_DISPATCH, () =>
      this.dispatch(),
    );
  }

  private async dispatch(): Promise<{ processed: number; created: number }> {
    const due = await this.messageOrm.find({
      where: {
        status: MessageStatus.DRAFT,
        scheduledAt: LessThanOrEqual(new Date()),
      },
    });

    let sent = 0;
    for (const message of due) {
      try {
        await this.messagingService.send(message.id);
        sent++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Scheduled send failed for message ${message.id}: ${reason}`,
        );
      }
    }

    return { processed: due.length, created: sent };
  }
}
