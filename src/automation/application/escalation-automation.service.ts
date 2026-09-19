import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity';
import { UserRole } from '../../users/domain/user';
import { FollowUpService } from '../../follow-ups/application/follow-up.service';
import { NotificationsService } from '../../notifications/application/notifications.service';
import { AutomationRunLogService } from './automation-run-log.service';
import { AutomationTrigger } from '../domain/automation-run';

const DEFAULT_OVERDUE_DAYS = 2;

@Injectable()
export class EscalationAutomationService {
  private readonly logger = new Logger(EscalationAutomationService.name);
  private readonly overdueDays: number;

  constructor(
    @InjectRepository(UserEntity)
    private readonly userOrm: Repository<UserEntity>,
    private readonly followUpService: FollowUpService,
    private readonly notificationsService: NotificationsService,
    private readonly runLog: AutomationRunLogService,
    config: ConfigService,
  ) {
    this.overdueDays = Number(
      config.get('ESCALATION_OVERDUE_DAYS', DEFAULT_OVERDUE_DAYS),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runSweep(): Promise<void> {
    await this.runLog.record(AutomationTrigger.ESCALATION_SWEEP, () =>
      this.sweep(),
    );
  }

  private async sweep(): Promise<{ processed: number; created: number }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.overdueDays);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const overdueTasks =
      await this.followUpService.findOverdueUnescalated(cutoffDate);
    if (overdueTasks.length === 0) {
      return { processed: 0, created: 0 };
    }

    const admins = await this.userOrm.find({
      where: [{ role: UserRole.ADMIN }, { role: UserRole.SUPER_ADMIN }],
    });
    const activeAdmins = admins.filter((a) => a.isActive);
    if (activeAdmins.length === 0) {
      this.logger.warn('No active admin/super_admin found — cannot escalate');
      return { processed: overdueTasks.length, created: 0 };
    }

    let escalated = 0;
    for (const task of overdueTasks) {
      const loads = await Promise.all(
        activeAdmins.map(async (admin) => ({
          admin,
          openCount: await this.followUpService.countOpenByOwner(admin.id),
        })),
      );
      loads.sort((a, b) => a.openCount - b.openCount);
      const target = loads[0].admin;

      await this.followUpService.escalate(task.id, {
        toOwnerId: target.id,
        reason: `Overdue by more than ${this.overdueDays} day(s)`,
      });

      await this.notificationsService.create({
        userId: target.id,
        title: 'Follow-up escalated to you',
        body: `"${task.title}" was overdue and has been reassigned to you.`,
        link: `/follow-ups?taskId=${task.id}`,
      });

      escalated++;
    }

    this.logger.log(
      `Escalation sweep: ${overdueTasks.length} overdue, ${escalated} escalated`,
    );
    return { processed: overdueTasks.length, created: escalated };
  }
}
