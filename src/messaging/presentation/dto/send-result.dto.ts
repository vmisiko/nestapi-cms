import type { SendResult } from '../../application/messaging.service';

export class SendResultDto {
  messageId: string;
  totalRecipients: number;
  sent: number;
  failed: number;
  skipped: number;

  constructor(r: SendResult) {
    this.messageId = r.messageId;
    this.totalRecipients = r.totalRecipients;
    this.sent = r.sent;
    this.failed = r.failed;
    this.skipped = r.skipped;
  }
}
