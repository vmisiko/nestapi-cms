import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ISmsProvider, OutboundSms, SmsResult } from '../domain/i-sms-provider';

export interface UwaziiOutboundMessage {
  to: string;
  text: string;
}

export interface UwaziiSendResult {
  to: string;
  /** Uwazii's per-message reference ID — present when accepted */
  ref: string | null;
  accepted: boolean;
  reason: string | null;
}

interface UwaziiApiMessage {
  to: string;
  id?: string;
  status?: string;
  error?: string;
  message_id?: string;
  messageId?: string;
}

interface UwaziiApiResponse {
  status?: string;
  success?: boolean;
  messages?: UwaziiApiMessage[];
  data?: UwaziiApiMessage[];
}

const UWAZII_BATCH_SIZE = 100;

@Injectable()
export class UwaziiProvider implements ISmsProvider {
  readonly name = 'UwaziiProvider';
  private readonly logger = new Logger(UwaziiProvider.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly from: string;
  private readonly callbackUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>(
      'UWAZII_BASE_URL',
      'https://restapi.uwaziimobile.com',
    );
    this.accessToken = config.getOrThrow<string>('UWAZII_ACCESS_TOKEN');
    this.from = config.get<string>('UWAZII_FROM', 'CityMega');
    this.callbackUrl = config.getOrThrow<string>('UWAZII_CALLBACK_URL');
  }

  /**
   * Send a batch of messages to the Uwazii API.
   * Automatically splits into chunks of UWAZII_BATCH_SIZE if needed.
   * Returns one result per input message in the same order.
   */
  async sendBatch(
    messages: OutboundSms[],
  ): Promise<SmsResult[]> {
    if (messages.length === 0) return [];

    const results: UwaziiSendResult[] = [];
    const chunks = this.chunk(messages, UWAZII_BATCH_SIZE);

    for (const chunk of chunks) {
      const chunkResults = await this.sendChunk(chunk);
      results.push(...chunkResults);
    }

    return results;
  }

  private async sendChunk(
    messages: UwaziiOutboundMessage[],
  ): Promise<UwaziiSendResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v1/send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          callback_url: this.callbackUrl,
          messages,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(`Uwazii API error ${response.status}: ${body}`);
        return messages.map((m) => ({
          to: m.to,
          ref: null,
          accepted: false,
          reason: `HTTP ${response.status}`,
        }));
      }

      const body = (await response.json()) as UwaziiApiResponse;
      return this.parseResponse(messages, body);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Uwazii request failed: ${reason}`);
      return messages.map((m) => ({
        to: m.to,
        ref: null,
        accepted: false,
        reason,
      }));
    }
  }

  private parseResponse(
    messages: UwaziiOutboundMessage[],
    body: UwaziiApiResponse,
  ): UwaziiSendResult[] {
    // Uwazii may return results under `messages` or `data`
    const apiMessages: UwaziiApiMessage[] = body.messages ?? body.data ?? [];

    // Build a lookup by phone number for the API response
    const byPhone = new Map<string, UwaziiApiMessage>();
    for (const m of apiMessages) {
      byPhone.set(m.to, m);
    }

    return messages.map((m) => {
      const apiMsg = byPhone.get(m.to);
      if (!apiMsg) {
        // No matching entry in response — treat as sent (API may return minimal body)
        return { to: m.to, ref: null, accepted: true, reason: null };
      }
      const ref = apiMsg.id ?? apiMsg.message_id ?? apiMsg.messageId ?? null;
      const failed = apiMsg.status === 'rejected' || apiMsg.status === 'failed';
      return {
        to: m.to,
        ref,
        accepted: !failed,
        reason: failed ? (apiMsg.error ?? 'rejected') : null,
      };
    });
  }

  /** Normalize a Kenyan phone number to Uwazii's expected 254XXXXXXXXX format */
  static normalizePhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, '');
    if (digits.startsWith('254') && digits.length === 12) return digits;
    if (digits.startsWith('0') && digits.length === 10)
      return `254${digits.slice(1)}`;
    if (
      (digits.startsWith('7') || digits.startsWith('1')) &&
      digits.length === 9
    ) {
      return `254${digits}`;
    }
    return null;
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  }
}
