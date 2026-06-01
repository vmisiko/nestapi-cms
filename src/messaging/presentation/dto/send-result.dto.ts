import { ApiProperty } from '@nestjs/swagger';
import type { SendResult } from '../../application/messaging.service';

export class SendResultDto {
  @ApiProperty()
  messageId: string;

  @ApiProperty()
  totalRecipients: number;

  @ApiProperty()
  sent: number;

  @ApiProperty()
  failed: number;

  @ApiProperty()
  skipped: number;

  constructor(r: SendResult) {
    this.messageId = r.messageId;
    this.totalRecipients = r.totalRecipients;
    this.sent = r.sent;
    this.failed = r.failed;
    this.skipped = r.skipped;
  }
}
