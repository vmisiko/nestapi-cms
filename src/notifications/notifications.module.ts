import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEntity } from './infrastructure/notification.entity';
import { NotificationRepository } from './infrastructure/notification.repository';
import { NotificationsService } from './application/notifications.service';
import { NotificationsController } from './presentation/notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationEntity])],
  controllers: [NotificationsController],
  providers: [NotificationRepository, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
