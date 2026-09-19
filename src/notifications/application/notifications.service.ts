import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../infrastructure/notification.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly repo: NotificationRepository) {}

  create(data: {
    userId: string;
    title: string;
    body: string;
    link?: string | null;
  }) {
    return this.repo.create(data);
  }

  async findForUser(userId: string) {
    const [notifications, unreadCount] = await Promise.all([
      this.repo.findForUser(userId),
      this.repo.countUnread(userId),
    ]);
    return { notifications, unreadCount };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.repo.markRead(id, userId);
    if (!notification)
      throw new NotFoundException(`Notification ${id} not found`);
    return notification;
  }
}
