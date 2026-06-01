import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageEntity } from './infrastructure/message.entity';
import { MessageRepository } from './infrastructure/message.repository';
import { MessagingService } from './application/messaging.service';
import { MessagingController } from './presentation/messaging.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MessageEntity])],
  controllers: [MessagingController],
  providers: [MessageRepository, MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
