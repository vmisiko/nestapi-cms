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
  MEMBERS = 'members',
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
  memberIds: string[];
  status: MessageStatus;
  scheduledAt: Date | null;
  sentAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
