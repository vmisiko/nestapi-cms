import type { Message } from '../../domain/message';

export class MessageResponseDto {
  id: string;
  title: string;
  body: string;
  type: string;
  targetGroup: string;
  targetId: string | null;
  status: string;
  scheduledAt: Date | null;
  sentAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(m: Message) {
    this.id = m.id;
    this.title = m.title;
    this.body = m.body;
    this.type = m.type;
    this.targetGroup = m.targetGroup;
    this.targetId = m.targetId;
    this.status = m.status;
    this.scheduledAt = m.scheduledAt;
    this.sentAt = m.sentAt;
    this.createdBy = m.createdBy;
    this.createdAt = m.createdAt;
    this.updatedAt = m.updatedAt;
  }
}
