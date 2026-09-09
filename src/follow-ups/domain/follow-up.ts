export enum FollowUpStatus {
  OPEN = 'open',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum FollowUpContactMethod {
  CALL = 'call',
  SMS = 'sms',
  EMAIL = 'email',
  VISIT = 'visit',
  OTHER = 'other',
}

export enum FollowUpOutcome {
  CONNECTED = 'connected',
  NO_ANSWER = 'no_answer',
  REQUESTED_CALLBACK = 'requested_callback',
  NOT_INTERESTED = 'not_interested',
  WRONG_NUMBER = 'wrong_number',
  OTHER = 'other',
}

export interface FollowUpTask {
  id: string;
  memberId: string;
  ownerId: string | null;
  title: string;
  notes: string | null;
  dueDate: string;
  status: FollowUpStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUpAttempt {
  id: string;
  taskId: string;
  contactMethod: FollowUpContactMethod;
  outcome: FollowUpOutcome;
  notes: string | null;
  contactedAt: Date;
  createdById: string | null;
  createdAt: Date;
}
