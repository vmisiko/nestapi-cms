import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { NotificationEntity } from './notification.entity';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifications: Repository<NotificationEntity>,
  ) {}

  create(data: {
    userId: string;
    title: string;
    body: string;
    link?: string | null;
  }): Promise<NotificationEntity> {
    const notification = this.notifications.create({
      userId: data.userId,
      title: data.title,
      body: data.body,
      link: data.link ?? null,
      readAt: null,
    });
    return this.notifications.save(notification);
  }

  findForUser(userId: string): Promise<NotificationEntity[]> {
    return this.notifications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.notifications.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(
    id: string,
    userId: string,
  ): Promise<NotificationEntity | null> {
    const notification = await this.notifications.findOne({
      where: { id, userId },
    });
    if (!notification) return null;
    if (!notification.readAt) {
      notification.readAt = new Date();
      await this.notifications.save(notification);
    }
    return notification;
  }
}
