import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  ISmsProvider,
  OutboundSms,
  SmsResult,
} from '../domain/i-sms-provider';

// ── Uwazii REST API v6.4 response shapes ────────────────────────────────────

interface UwaziiApiResponse {
  status: boolean;
  error_code?: number;
  errors?: string;
}

interface UwaziiAuthorizeResponse extends UwaziiApiResponse {
  /** authorization_code used to obtain the access token */
  data?: { authorization_code: string };
}

interface UwaziiTokenResponse extends UwaziiApiResponse {
  data?: { access_token: string };
}

/**
 * `/send` response: { status: true, data: { "<phone>": [{ id_state: "<uuid>" }] } }
 * Each phone key maps to an array of id_state objects (one per SMS part).
 */
interface UwaziiSendResponse extends UwaziiApiResponse {
  data?: Record<string, Array<{ id_state: string }>>;
}

/** One element of the `/send` request body array */
interface UwaziiSendItem {
  number: string[];
  senderID: string;
  text: string;
  type: 'sms';
  delivery?: boolean;
}

/** Max recipients per `/send` batch (Uwazii enforces ≤ 100 per package) */
const MAX_PER_BATCH = 100;

// ────────────────────────────────────────────────────────────────────────────

@Injectable()
export class UwaziiProvider implements ISmsProvider {
  readonly name = 'UwaziiProvider';
  private readonly logger = new Logger(UwaziiProvider.name);

  private readonly baseUrl: string;
  private readonly senderId: string;
  private readonly deliveryEnabled: boolean;

  /** If set, skip the OAuth flow and use this token directly. */
  private readonly staticToken: string | null;

  /** OAuth credentials (used when UWAZII_ACCESS_TOKEN is not set). */
  private readonly username: string | null;
  private readonly password: string | null;

  /** In-memory token cache — cleared on 401 to force a refresh. */
  private cachedToken: string | null = null;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>(
      'UWAZII_BASE_URL',
      'https://restapi.uwaziimobile.com',
    );

    // UWAZII_SENDER_ID takes priority; fall back to the old UWAZII_FROM key.
    this.senderId =
      config.get<string>('UWAZII_SENDER_ID') ??
      config.get<string>('UWAZII_FROM', 'CityMega');

    // Delivery reports require a DLR webhook URL configured at account level.
    const callbackUrl = config.get<string>('UWAZII_CALLBACK_URL', '');
    this.deliveryEnabled = callbackUrl.length > 0;

    // Auth: static token takes priority over OAuth credentials.
    this.staticToken = config.get<string>('UWAZII_ACCESS_TOKEN') ?? null;
    this.username = config.get<string>('UWAZII_USERNAME') ?? null;
    this.password = config.get<string>('UWAZII_PASSWORD') ?? null;

    if (!this.staticToken && (!this.username || !this.password)) {
      throw new Error(
        'UwaziiProvider: set UWAZII_ACCESS_TOKEN (static) ' +
          'or both UWAZII_USERNAME + UWAZII_PASSWORD (OAuth).',
      );
    }
  }

  // ── Public ISmsProvider interface ─────────────────────────────────────────

  /**
   * Send a batch of outbound SMS messages.
   * Groups by text so a single campaign (same body, many recipients) uses
   * one `/send` call per 100 recipients instead of one call per recipient.
   * Returns one SmsResult per input message in the same order.
   */
  async sendBatch(messages: OutboundSms[]): Promise<SmsResult[]> {
    if (messages.length === 0) return [];

    const token = await this.acquireToken();
    return this.dispatch(messages, token, /* retry */ false);
  }

  // ── Token management ──────────────────────────────────────────────────────

  private async acquireToken(): Promise<string> {
    if (this.staticToken) return this.staticToken;
    if (this.cachedToken) return this.cachedToken;

    const token = await this.fetchFreshToken();
    this.cachedToken = token;
    return token;
  }

  /**
   * OAuth 2-step flow:
   *   POST /v1/authorize  → authorization_code
   *   POST /v1/accesstoken → access_token
   */
  private async fetchFreshToken(): Promise<string> {
    // Step 1 — authorize
    const authRes = await fetch(`${this.baseUrl}/v1/authorize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    if (!authRes.ok) {
      throw new Error(`Uwazii authorize failed with HTTP ${authRes.status}`);
    }

    const authData = (await authRes.json()) as UwaziiAuthorizeResponse;
    if (!authData.status) {
      throw new Error(
        `Uwazii authorize failed: ${authData.errors ?? 'unknown error'}`,
      );
    }
    const authCode = authData.data?.authorization_code;
    if (!authCode) {
      throw new Error('Uwazii authorize: response missing authorization_code');
    }

    // Step 2 — exchange code for access token
    const tokenRes = await fetch(`${this.baseUrl}/v1/accesstoken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ authorization_code: authCode }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Uwazii accesstoken failed with HTTP ${tokenRes.status}`);
    }

    const tokenData = (await tokenRes.json()) as UwaziiTokenResponse;
    if (!tokenData.status) {
      throw new Error(
        `Uwazii accesstoken failed: ${tokenData.errors ?? 'unknown error'}`,
      );
    }
    const token = tokenData.data?.access_token;
    if (!token) {
      throw new Error('Uwazii accesstoken: response missing access_token');
    }

    this.logger.log('Uwazii: access token acquired via OAuth');
    return token;
  }

  // ── Dispatch ──────────────────────────────────────────────────────────────

  private async dispatch(
    messages: OutboundSms[],
    token: string,
    isRetry: boolean,
  ): Promise<SmsResult[]> {
    // Group messages by body text — same text → one API call with multiple numbers
    const byText = new Map<
      string,
      { originalIndices: number[]; phones: string[] }
    >();
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const group = byText.get(msg.text);
      if (group) {
        group.originalIndices.push(i);
        group.phones.push(msg.to);
      } else {
        byText.set(msg.text, { originalIndices: [i], phones: [msg.to] });
      }
    }

    const results: SmsResult[] = new Array<SmsResult>(messages.length);
    let encountered401 = false;

    for (const [text, { originalIndices, phones }] of byText) {
      // Chunk into ≤ 100 recipients per API call
      for (let start = 0; start < phones.length; start += MAX_PER_BATCH) {
        const batchPhones = phones.slice(start, start + MAX_PER_BATCH);
        const batchIndices = originalIndices.slice(
          start,
          start + MAX_PER_BATCH,
        );

        const { batchResults, got401 } = await this.sendOneBatch(
          batchPhones,
          text,
          token,
        );
        if (got401) encountered401 = true;

        batchIndices.forEach((origIdx, batchPos) => {
          results[origIdx] = batchResults[batchPos] ?? {
            to: messages[origIdx].to,
            ref: null,
            accepted: false,
            reason: 'Missing result from provider',
          };
        });
      }
    }

    // If any call got 401 and this is not already a retry, refresh and retry once
    if (encountered401 && !isRetry && !this.staticToken) {
      this.logger.warn('Uwazii: 401 received — refreshing token and retrying');
      this.cachedToken = null;
      const freshToken = await this.acquireToken();
      return this.dispatch(messages, freshToken, /* isRetry */ true);
    }

    return results;
  }

  private async sendOneBatch(
    phones: string[],
    text: string,
    token: string,
  ): Promise<{ batchResults: SmsResult[]; got401: boolean }> {
    const body: UwaziiSendItem[] = [
      {
        number: phones,
        senderID: this.senderId,
        text,
        type: 'sms',
        ...(this.deliveryEnabled && { delivery: true }),
      },
    ];

    try {
      const response = await fetch(`${this.baseUrl}/v1/send`, {
        method: 'POST',
        headers: {
          'X-Access-Token': token, // Uwazii uses X-Access-Token, not Bearer
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 401) {
        return {
          batchResults: phones.map((to) => ({
            to,
            ref: null,
            accepted: false,
            reason: 'Unauthorized',
          })),
          got401: true,
        };
      }

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`Uwazii /send HTTP ${response.status}: ${errText}`);
        return {
          batchResults: phones.map((to) => ({
            to,
            ref: null,
            accepted: false,
            reason: UwaziiProvider.extractApiError(errText, response.status),
          })),
          got401: false,
        };
      }

      const data = (await response.json()) as UwaziiSendResponse;
      if (!data.status) {
        const reason =
          data.errors ??
          (data.error_code != null
            ? `API error ${data.error_code}`
            : 'Send rejected by provider');
        this.logger.error(`Uwazii /send rejected: ${reason}`);
        return {
          batchResults: phones.map((to) => ({
            to,
            ref: null,
            accepted: false,
            reason,
          })),
          got401: false,
        };
      }
      return { batchResults: this.parseResponse(phones, data), got401: false };
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Network error';
      this.logger.error(`Uwazii sendBatch network error: ${reason}`);
      return {
        batchResults: phones.map((to) => ({
          to,
          ref: null,
          accepted: false,
          reason,
        })),
        got401: false,
      };
    }
  }

  /**
   * Parse the Uwazii response map:
   *   { "status": true, "data": { "254712345678": [{ "id_state": "uuid" }] } }
   *
   * Returns one SmsResult per phone, in the same order as the input array.
   */
  private parseResponse(
    phones: string[],
    data: UwaziiSendResponse,
  ): SmsResult[] {
    const phoneMap = data.data ?? {};
    return phones.map((phone) => {
      const entries = UwaziiProvider.lookupPhoneEntries(phoneMap, phone);
      if (!entries || entries.length === 0) {
        // Phone not in response — Uwazii may omit accepted numbers; treat as success.
        return { to: phone, ref: null, accepted: true, reason: null };
      }
      const ref = entries[0]?.id_state ?? null;
      return { to: phone, ref, accepted: true, reason: null };
    });
  }

  // ── Utilities ─────────────────────────────────────────────────────────────

  /** Parse Uwazii error JSON bodies: { status: false, errors: "..." } */
  static extractApiError(body: string, httpStatus: number): string {
    try {
      const parsed = JSON.parse(body) as UwaziiApiResponse;
      if (parsed.errors) return parsed.errors;
    } catch {
      /* body is plain text */
    }
    return `HTTP ${httpStatus}`;
  }

  /** Match a phone to Uwazii's response map (keys may differ in formatting). */
  static lookupPhoneEntries(
    phoneMap: Record<string, Array<{ id_state: string }>>,
    phone: string,
  ): Array<{ id_state: string }> | undefined {
    const direct = phoneMap[phone];
    if (direct?.length) return direct;

    const digits = phone.replace(/\D/g, '');
    for (const [key, entries] of Object.entries(phoneMap)) {
      if (entries.length > 0 && key.replace(/\D/g, '') === digits) {
        return entries;
      }
    }
    return undefined;
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
}
