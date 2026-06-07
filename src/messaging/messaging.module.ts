import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './infrastructure/message.entity';
import { MessageDeliveryEntity } from './infrastructure/message-delivery.entity';
import { MessageRepository } from './infrastructure/message.repository';
import { MessageDeliveryRepository } from './infrastructure/message-delivery.repository';
import { UwaziiProvider } from './infrastructure/uwazii.provider';
import { PRIMARY_SMS_PROVIDER, SmsProviderService } from './infrastructure/sms-provider.service';
import { MessagingService } from './application/messaging.service';
import { TargetGroupResolverService } from './application/target-group-resolver.service';
import { MessagingController } from './presentation/messaging.controller';
import { MemberEntity } from '../members/infrastructure/member.entity';
import { FellowshipEntity } from '../fellowships/infrastructure/fellowship.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MessageEntity,
      MessageDeliveryEntity,
      // Needed by TargetGroupResolverService — directly injected ORM repos
      MemberEntity,
      FellowshipEntity,
    ]),
  ],
  controllers: [MessagingController],
  providers: [
    MessageRepository,
    MessageDeliveryRepository,
    UwaziiProvider,
    {
      provide: PRIMARY_SMS_PROVIDER,
      useExisting: UwaziiProvider,
    },
    SmsProviderService,
    TargetGroupResolverService,
    MessagingService,
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
