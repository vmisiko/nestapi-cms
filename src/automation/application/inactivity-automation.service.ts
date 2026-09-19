import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import { AttendanceRecordEntity } from '../../attendance/infrastructure/attendance-record.entity';
import { AttendanceStatus } from '../../attendance/domain/attendance-record';
import { ActivityStatus } from '../../core/domain/enums';
import { FollowUpService } from '../../follow-ups/application/follow-up.service';
import { FollowUpSource } from '../../follow-ups/domain/follow-up';
import { AutomationRunLogService } from './automation-run-log.service';
import { AutomationTrigger } from '../domain/automation-run';

const DEFAULT_INACTIVITY_DAYS = 30;
const DUE_IN_DAYS = 3;

interface InactiveCandidate {
  id: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class InactivityAutomationService {
  private readonly logger = new Logger(InactivityAutomationService.name);
  private readonly thresholdDays: number;

  constructor(
    @InjectRepository(MemberEntity)
    private readonly memberOrm: Repository<MemberEntity>,
    private readonly followUpService: FollowUpService,
    private readonly runLog: AutomationRunLogService,
    config: ConfigService,
  ) {
    this.thresholdDays = Number(
      config.get('INACTIVITY_DAYS_THRESHOLD', DEFAULT_INACTIVITY_DAYS),
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async runSweep(): Promise<void> {
    await this.runLog.record(AutomationTrigger.INACTIVITY_SWEEP, () =>
      this.sweep(),
    );
  }

  private async sweep(): Promise<{ processed: number; created: number }> {
    const candidates = await this.findInactiveCandidates();
    let created = 0;

    for (const member of candidates) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + DUE_IN_DAYS);

      const { created: wasCreated } =
        await this.followUpService.createAutomated({
          memberId: member.id,
          title: `Check in — inactive member: ${member.firstName} ${member.lastName}`,
          dueDate: dueDate.toISOString().slice(0, 10),
          source: FollowUpSource.INACTIVITY_AUTOMATION,
        });

      if (wasCreated) {
        created++;
        await this.memberOrm.update(member.id, {
          activityStatus: ActivityStatus.INACTIVE,
        });
      }
    }

    this.logger.log(
      `Inactivity sweep: ${candidates.length} candidates, ${created} tasks created`,
    );
    return { processed: candidates.length, created };
  }

  private async findInactiveCandidates(): Promise<InactiveCandidate[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.thresholdDays);
    const cutoffDate = cutoff.toISOString().slice(0, 10);

    const rows = await this.memberOrm
      .createQueryBuilder('m')
      .leftJoin(
        AttendanceRecordEntity,
        'r',
        'r.member_id = m.id AND r.status = :present',
        { present: AttendanceStatus.PRESENT },
      )
      .leftJoin('attendance_sessions', 's', 's.id = r.session_id')
      .select('m.id', 'id')
      .addSelect('m.first_name', 'firstName')
      .addSelect('m.last_name', 'lastName')
      .addSelect('MAX(s.session_date)', 'lastPresentDate')
      .where('m.activity_status = :active', { active: ActivityStatus.ACTIVE })
      .groupBy('m.id')
      .having('MAX(s.session_date) IS NULL OR MAX(s.session_date) < :cutoff', {
        cutoff: cutoffDate,
      })
      .andHaving('m.joined_at < :cutoff', { cutoff: cutoffDate })
      .getRawMany<InactiveCandidate & { lastPresentDate: string | null }>();

    return rows.map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
    }));
  }
}
