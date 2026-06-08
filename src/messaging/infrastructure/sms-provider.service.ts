import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import type {
  ISmsProvider,
  OutboundSms,
  SmsResult,
} from '../domain/i-sms-provider';

export const PRIMARY_SMS_PROVIDER = 'PRIMARY_SMS_PROVIDER';
export const FALLBACK_SMS_PROVIDER = 'FALLBACK_SMS_PROVIDER';

@Injectable()
export class SmsProviderService implements ISmsProvider {
  readonly name = 'SmsProviderService';
  private readonly logger = new Logger(SmsProviderService.name);

  constructor(
    @Inject(PRIMARY_SMS_PROVIDER) private readonly primary: ISmsProvider,
    @Optional()
    @Inject(FALLBACK_SMS_PROVIDER)
    private readonly fallback?: ISmsProvider,
  ) {}

  async sendBatch(messages: OutboundSms[]): Promise<SmsResult[]> {
    try {
      return await this.primary.sendBatch(messages);
    } catch (err) {
      if (this.fallback) {
        this.logger.warn(
          `Primary SMS provider "${this.primary.name}" failed — failing over to "${this.fallback.name}": ${err instanceof Error ? err.message : String(err)}`,
        );
        return this.fallback.sendBatch(messages);
      }
      throw err;
    }
  }
}
