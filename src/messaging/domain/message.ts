export enum MessageType {
  ANNOUNCEMENT = 'announcement',
  NEWSLETTER = 'newsletter',
  REMINDER = 'reminder',
  ALERT = 'alert',
}

export enum MessageTargetGroup {
  ALL = 'all',
  FELLOWSHIP = 'fellowship',
  DEPARTMENT = 'department',
  ZONE = 'zone',
}

export enum MessageStatus {
  DRAFT = 'draft',
  SENT = 'sent',
}

export interface Message {
  id: string;
  title: string;
  body: string;
  type: MessageType;
  targetGroup: MessageTargetGroup;
  targetId: string | null;
  status: MessageStatus;
  scheduledAt: Date | null;
  sentAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
