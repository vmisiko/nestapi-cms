export enum AutomationTrigger {
  VISITOR_SIGNUP = 'visitor_signup',
  INACTIVITY_SWEEP = 'inactivity_sweep',
  ESCALATION_SWEEP = 'escalation_sweep',
  SCHEDULED_MESSAGE_DISPATCH = 'scheduled_message_dispatch',
}

export enum AutomationRunStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface AutomationRun {
  id: string;
  trigger: AutomationTrigger;
  status: AutomationRunStatus;
  itemsProcessed: number;
  itemsCreated: number;
  detail: string | null;
  ranAt: Date;
}
