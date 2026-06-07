export interface OutboundSms {
  to: string;
  text: string;
}

export interface SmsResult {
  to: string;
  ref: string | null;
  accepted: boolean;
  reason: string | null;
}

export interface ISmsProvider {
  readonly name: string;
  sendBatch(messages: OutboundSms[]): Promise<SmsResult[]>;
}
