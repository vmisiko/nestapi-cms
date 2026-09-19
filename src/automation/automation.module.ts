import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationRunEntity } from './infrastructure/automation-run.entity';
import { AutomationRunLogService } from './application/automation-run-log.service';
import { VisitorAutomationService } from './application/visitor-automation.service';
import { InactivityAutomationService } from './application/inactivity-automation.service';
import { EscalationAutomationService } from './application/escalation-automation.service';
import { ScheduledMessageDispatchService } from './application/scheduled-message-dispatch.service';
import { AutomationController } from './presentation/automation.controller';
import { MemberEntity } from '../members/infrastructure/member.entity';
import { UserEntity } from '../users/infrastructure/user.entity';
import { MessageEntity } from '../messaging/infrastructure/message.entity';
import { FollowUpsModule } from '../follow-ups/follow-ups.module';
import { MessagingModule } from '../messaging/messaging.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AutomationRunEntity,
      MemberEntity,
      UserEntity,
      MessageEntity,
    ]),
    FollowUpsModule,
    MessagingModule,
    NotificationsModule,
  ],
  controllers: [AutomationController],
  providers: [
    AutomationRunLogService,
    VisitorAutomationService,
    InactivityAutomationService,
    EscalationAutomationService,
    ScheduledMessageDispatchService,
  ],
  exports: [AutomationRunLogService, VisitorAutomationService],
})
export class AutomationModule {}
