import { Injectable } from '@nestjs/common';
import { FollowUpService } from '../../follow-ups/application/follow-up.service';
import { FollowUpSource } from '../../follow-ups/domain/follow-up';
import { ChurchRole } from '../../core/domain/enums';
import type { Member } from '../../members/domain/member';
import { AutomationRunLogService } from './automation-run-log.service';
import { AutomationTrigger } from '../domain/automation-run';

const DUE_IN_DAYS = 2;

@Injectable()
export class VisitorAutomationService {
  constructor(
    private readonly followUpService: FollowUpService,
    private readonly runLog: AutomationRunLogService,
  ) {}

  async handleNewMember(member: Member): Promise<void> {
    await this.runLog.record(AutomationTrigger.VISITOR_SIGNUP, async () => {
      if (member.churchRole !== ChurchRole.FIRST_TIME_VISITOR) {
        return { processed: 1, created: 0 };
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + DUE_IN_DAYS);

      const { created } = await this.followUpService.createAutomated({
        memberId: member.id,
        title: `Welcome & connect — ${member.firstName} ${member.lastName}`,
        dueDate: dueDate.toISOString().slice(0, 10),
        source: FollowUpSource.VISITOR_AUTOMATION,
      });

      return { processed: 1, created: created ? 1 : 0 };
    });
  }
}
