import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './infrastructure/message.entity';
import { MessageDeliveryEntity } from './infrastructure/message-delivery.entity';
import { MessageTemplateEntity } from './infrastructure/message-template.entity';
import { MessageRepository } from './infrastructure/message.repository';
import { MessageDeliveryRepository } from './infrastructure/message-delivery.repository';
import { MessageTemplateRepository } from './infrastructure/message-template.repository';
import { UwaziiProvider } from './infrastructure/uwazii.provider';
import {
  PRIMARY_SMS_PROVIDER,
  SmsProviderService,
} from './infrastructure/sms-provider.service';
import { MessagingService } from './application/messaging.service';
import { MessagingTemplatesService } from './application/messaging-templates.service';
import { TargetGroupResolverService } from './application/target-group-resolver.service';
import { MessagingController } from './presentation/messaging.controller';
import { MessagingTemplatesController } from './presentation/messaging-templates.controller';
import { MemberEntity } from '../members/infrastructure/member.entity';
import { FellowshipEntity } from '../fellowships/infrastructure/fellowship.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageEntity,
      MessageDeliveryEntity,
      MessageTemplateEntity,
      // Needed by TargetGroupResolverService — directly injected ORM repos
      MemberEntity,
      FellowshipEntity,
    ]),
  ],
  controllers: [MessagingTemplatesController, MessagingController],
  providers: [
    MessageRepository,
    MessageDeliveryRepository,
    MessageTemplateRepository,
    UwaziiProvider,
    {
      provide: PRIMARY_SMS_PROVIDER,
      useExisting: UwaziiProvider,
    },
    SmsProviderService,
    TargetGroupResolverService,
    MessagingService,
    MessagingTemplatesService,
  ],
  exports: [MessagingService, MessagingTemplatesService],
})
export class MessagingModule {}
