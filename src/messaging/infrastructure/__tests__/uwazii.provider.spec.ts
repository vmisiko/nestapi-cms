import { ConfigService } from '@nestjs/config';
import { UwaziiProvider } from '../uwazii.provider';

// ── ConfigService mock ────────────────────────────────────────────────────────

function makeConfigService(
  overrides: Record<string, string | undefined> = {},
): ConfigService {
  const base: Record<string, string> = {
    UWAZII_BASE_URL: 'https://api.uwazii.test',
    UWAZII_ACCESS_TOKEN: 'test-token',
    UWAZII_SENDER_ID: 'TestSender',
    UWAZII_CALLBACK_URL: 'https://cms.test/dlr',
  };

  const config: Record<string, string | undefined> = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete config[key];
    } else {
      config[key] = value;
    }
  }

  return {
    get: jest.fn((key: string, fallback?: string) => {
      if (key in config) return config[key];
      return fallback;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (config[key] === undefined)
        throw new Error(`Config key ${key} not found`);
      return config[key];
    }),
  } as unknown as ConfigService;
}

function makeProvider(
  configOverrides: Record<string, string | undefined> = {},
): UwaziiProvider {
  return new UwaziiProvider(makeConfigService(configOverrides));
}

function makeFetchResponse(body: unknown, status = 200, ok = true): Response {
  const textBody = typeof body === 'string' ? body : JSON.stringify(body);

  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(textBody),
  } as unknown as Response;
}

/** Build the Uwazii success response: phone → [{ id_state }] */
function makeUwaziiResponse(entries: Record<string, string>): {
  status: boolean;
  data: Record<string, Array<{ id_state: string }>>;
} {
  const data: Record<string, Array<{ id_state: string }>> = {};
  for (const [phone, idState] of Object.entries(entries)) {
    data[phone] = [{ id_state: idState }];
  }
  return { status: true, data };
}

function parseSendBody(callIndex: number, fetchSpy: jest.SpyInstance) {
  const [, init] = fetchSpy.mock.calls[callIndex] as [string, RequestInit];
  return JSON.parse(init.body as string) as Array<{
    number: string[];
    senderID: string;
    text: string;
    type: string;
    delivery?: boolean;
  }>;
}

function sendCalls(fetchSpy: jest.SpyInstance) {
  return fetchSpy.mock.calls.filter((c) =>
    (c[0] as string).includes('/v1/send'),
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UwaziiProvider', () => {
  let provider: UwaziiProvider;
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    provider = makeProvider();
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('throws when neither UWAZII_ACCESS_TOKEN nor OAuth credentials are set', () => {
      expect(() =>
        makeProvider({
          UWAZII_ACCESS_TOKEN: undefined,
          UWAZII_USERNAME: undefined,
          UWAZII_PASSWORD: undefined,
        }),
      ).toThrow('UwaziiProvider');
    });

    it('does not throw when UWAZII_ACCESS_TOKEN is set', () => {
      expect(() => makeProvider({ UWAZII_ACCESS_TOKEN: 'tok' })).not.toThrow();
    });

    it('does not throw when OAuth credentials are set (no static token)', () => {
      expect(() =>
        makeProvider({
          UWAZII_ACCESS_TOKEN: undefined,
          UWAZII_USERNAME: 'user',
          UWAZII_PASSWORD: 'pass',
        }),
      ).not.toThrow();
    });

    it('falls back to UWAZII_FROM when UWAZII_SENDER_ID is not set', async () => {
      const p = makeProvider({
        UWAZII_SENDER_ID: undefined,
        UWAZII_FROM: 'LegacySender',
      });
      fetchSpy.mockResolvedValue(
        makeFetchResponse(makeUwaziiResponse({ '254700000001': 'r' })),
      );

      await p.sendBatch([{ to: '254700000001', text: 'Hi' }]);

      expect(parseSendBody(0, fetchSpy)[0].senderID).toBe('LegacySender');
    });
  });

  describe('sendBatch', () => {
    it('returns [] without calling fetch when given an empty array', async () => {
      const result = await provider.sendBatch([]);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('uses X-Access-Token header (not Authorization: Bearer)', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse(makeUwaziiResponse({ '254700000001': 'ref-1' })),
      );

      await provider.sendBatch([{ to: '254700000001', text: 'Hello' }]);

      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      const headers = init.headers as Record<string, string>;
      expect(headers['X-Access-Token']).toBe('test-token');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('sends correct URL', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse(makeUwaziiResponse({ '254700000001': 'r' })),
      );
      await provider.sendBatch([{ to: '254700000001', text: 'Hello' }]);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.uwazii.test/v1/send',
        expect.anything(),
      );
    });

    it('sends request body as array with number[], senderID, text, type', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse(makeUwaziiResponse({ '254700000001': 'ref-1' })),
      );

      await provider.sendBatch([
        { to: '254700000001', text: 'Hello congregation' },
      ]);

      expect(parseSendBody(0, fetchSpy)[0]).toMatchObject({
        number: ['254700000001'],
        senderID: 'TestSender',
        text: 'Hello congregation',
        type: 'sms',
      });
    });

    it('groups same-text recipients into a single number[] array', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse(
          makeUwaziiResponse({
            '254700000001': 'ref-1',
            '254700000002': 'ref-2',
          }),
        ),
      );

      await provider.sendBatch([
        { to: '254700000001', text: 'Same text' },
        { to: '254700000002', text: 'Same text' },
      ]);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(parseSendBody(0, fetchSpy)[0].number).toEqual(
        expect.arrayContaining(['254700000001', '254700000002']),
      );
    });

    it('sends delivery:true when UWAZII_CALLBACK_URL is set', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse(makeUwaziiResponse({ '254700000001': 'r' })),
      );
      await provider.sendBatch([{ to: '254700000001', text: 'Hi' }]);

      expect(parseSendBody(0, fetchSpy)[0].delivery).toBe(true);
    });

    it('omits delivery field when UWAZII_CALLBACK_URL is empty', async () => {
      const p = makeProvider({ UWAZII_CALLBACK_URL: '' });
      fetchSpy.mockResolvedValue(
        makeFetchResponse(makeUwaziiResponse({ '254700000001': 'r' })),
      );
      await p.sendBatch([{ to: '254700000001', text: 'Hi' }]);

      expect(parseSendBody(0, fetchSpy)[0].delivery).toBeUndefined();
    });

    it('parses accepted message: extracts id_state as ref', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse(
          makeUwaziiResponse({ '254700000001': 'uwazii-ref-abc' }),
        ),
      );

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hello' },
      ]);

      expect(results[0]).toMatchObject({
        to: '254700000001',
        ref: 'uwazii-ref-abc',
        accepted: true,
        reason: null,
      });
    });

    it('returns accepted=true, ref=null when phone not in data map (minimal response)', async () => {
      fetchSpy.mockResolvedValue(makeFetchResponse({ status: true, data: {} }));

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hello' },
      ]);

      expect(results[0]).toMatchObject({
        to: '254700000001',
        ref: null,
        accepted: true,
        reason: null,
      });
    });

    it('returns results in the same order as input', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse(
          makeUwaziiResponse({
            '254700000001': 'ref-1',
            '254700000002': 'ref-2',
            '254700000003': 'ref-3',
          }),
        ),
      );

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hello' },
        { to: '254700000002', text: 'Hello' },
        { to: '254700000003', text: 'Hello' },
      ]);

      expect(results.map((r) => r.to)).toEqual([
        '254700000001',
        '254700000002',
        '254700000003',
      ]);
    });

    it('returns failed results for all messages when API returns non-2xx status', async () => {
      fetchSpy.mockResolvedValue(makeFetchResponse('Server error', 500, false));

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hi' },
        { to: '254700000002', text: 'Hi' },
      ]);

      expect(results).toHaveLength(2);
      results.forEach((r) => {
        expect(r.accepted).toBe(false);
        expect(r.reason).toBe('HTTP 500');
        expect(r.ref).toBeNull();
      });
    });

    it('extracts errors field from JSON body on HTTP 400', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse(
          {
            status: false,
            error_code: 400,
            errors: 'no_active_aggregator',
          },
          400,
          false,
        ),
      );

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hi' },
      ]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].reason).toBe('no_active_aggregator');
    });

    it('returns failed results when HTTP 200 but status:false in JSON body', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse({
          status: false,
          error_code: 400,
          errors: 'invalid_sender',
        }),
      );

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hi' },
      ]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].reason).toBe('invalid_sender');
    });

    it('splits batches of >100 same-text recipients into multiple /send calls', async () => {
      const phones = Array.from({ length: 150 }, (_, i) =>
        UwaziiProvider.normalizePhone(`07${String(i).padStart(8, '0')}`),
      ).filter((p): p is string => p !== null);

      expect(phones).toHaveLength(150);

      fetchSpy.mockResolvedValue(makeFetchResponse({ status: true, data: {} }));

      await provider.sendBatch(phones.map((to) => ({ to, text: 'Bulk' })));

      const calls = sendCalls(fetchSpy);
      expect(calls).toHaveLength(2);

      const batchSizes = calls.map((call) => {
        const body = JSON.parse(
          (call[1] as RequestInit).body as string,
        ) as Array<{
          number: string[];
        }>;
        return body[0].number.length;
      });
      expect(batchSizes).toEqual([100, 50]);
    });

    it('sends separate /send calls for different message bodies', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse(makeUwaziiResponse({ '254700000001': 'r1' })),
      );

      await provider.sendBatch([
        { to: '254700000001', text: 'Message A' },
        { to: '254700000002', text: 'Message B' },
      ]);

      expect(sendCalls(fetchSpy)).toHaveLength(2);
    });

    it('matches id_state when response phone key differs in formatting', async () => {
      fetchSpy.mockResolvedValue(
        makeFetchResponse({
          status: true,
          data: { '254700000001': [{ id_state: 'ref-formatted' }] },
        }),
      );

      const results = await provider.sendBatch([
        { to: '+254 700 000 001', text: 'Hello' },
      ]);

      expect(results[0]).toMatchObject({
        to: '+254 700 000 001',
        ref: 'ref-formatted',
        accepted: true,
      });
    });

    it('on 401 with static token: returns failed (no retry since static token)', async () => {
      fetchSpy.mockResolvedValue(makeFetchResponse('Unauthorized', 401, false));

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hi' },
      ]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].reason).toBe('Unauthorized');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('returns failed results for all messages when fetch throws a network error', async () => {
      fetchSpy.mockRejectedValue(new Error('Network unreachable'));

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hello' },
        { to: '254700000002', text: 'Hello' },
      ]);

      expect(results).toHaveLength(2);
      results.forEach((r) => {
        expect(r.accepted).toBe(false);
        expect(r.reason).toBe('Network unreachable');
        expect(r.ref).toBeNull();
      });
    });

    it('returns "Network error" reason when fetch throws a non-Error value', async () => {
      fetchSpy.mockRejectedValue('connection refused');

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hi' },
      ]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].reason).toBe('Network error');
    });
  });

  describe('OAuth token acquisition', () => {
    let oauthProvider: UwaziiProvider;

    beforeEach(() => {
      oauthProvider = makeProvider({
        UWAZII_ACCESS_TOKEN: undefined,
        UWAZII_USERNAME: 'user@church.org',
        UWAZII_PASSWORD: 'secret',
      });
    });

    it('calls /authorize then /accesstoken before /send', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { authorization_code: 'auth-code-123' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { access_token: 'oauth-token-xyz' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(makeUwaziiResponse({ '254700000001': 'ref-1' })),
        );

      await oauthProvider.sendBatch([{ to: '254700000001', text: 'Hello' }]);

      expect(fetchSpy).toHaveBeenCalledTimes(3);
      expect(fetchSpy.mock.calls[0][0]).toContain('/v1/authorize');
      expect(fetchSpy.mock.calls[1][0]).toContain('/v1/accesstoken');
      expect(fetchSpy.mock.calls[2][0]).toContain('/v1/send');
    });

    it('sends username and password in authorize request body', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { authorization_code: 'code' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { access_token: 'token' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(makeUwaziiResponse({ '254700000001': 'ref-1' })),
        );

      await oauthProvider.sendBatch([{ to: '254700000001', text: 'Hi' }]);

      const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(JSON.parse(init.body as string)).toEqual({
        username: 'user@church.org',
        password: 'secret',
      });
    });

    it('caches the token — second sendBatch skips authorize/accesstoken', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { authorization_code: 'code' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { access_token: 'token' },
          }),
        )
        .mockResolvedValue(
          makeFetchResponse(makeUwaziiResponse({ '254700000001': 'ref-1' })),
        );

      await oauthProvider.sendBatch([{ to: '254700000001', text: 'Hi' }]);
      await oauthProvider.sendBatch([{ to: '254700000001', text: 'Hi again' }]);

      expect(fetchSpy).toHaveBeenCalledTimes(4);
      const urls = fetchSpy.mock.calls.map((c) => c[0] as string);
      expect(urls.filter((u) => u.includes('/authorize'))).toHaveLength(1);
      expect(urls.filter((u) => u.includes('/accesstoken'))).toHaveLength(1);
      expect(sendCalls(fetchSpy)).toHaveLength(2);
    });

    it('uses the acquired OAuth token as X-Access-Token on /send', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { authorization_code: 'code' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { access_token: 'my-oauth-token' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(makeUwaziiResponse({ '254700000001': 'ref-1' })),
        );

      await oauthProvider.sendBatch([{ to: '254700000001', text: 'Hi' }]);

      const sendCall = sendCalls(fetchSpy)[0] as [string, RequestInit];
      const headers = sendCall[1].headers as Record<string, string>;
      expect(headers['X-Access-Token']).toBe('my-oauth-token');
    });

    it('throws when authorize response is missing authorization_code', async () => {
      fetchSpy.mockResolvedValueOnce(
        makeFetchResponse({ status: true, data: {} }),
      );

      await expect(
        oauthProvider.sendBatch([{ to: '254700000001', text: 'Hi' }]),
      ).rejects.toThrow('authorization_code');
    });

    it('throws when authorize returns status:false', async () => {
      fetchSpy.mockResolvedValueOnce(
        makeFetchResponse({
          status: false,
          error_code: 400,
          errors: 'Incorrect username or password',
        }),
      );

      await expect(
        oauthProvider.sendBatch([{ to: '254700000001', text: 'Hi' }]),
      ).rejects.toThrow('Incorrect username or password');
    });

    it('throws when accesstoken returns status:false', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { authorization_code: 'code' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: false,
            error_code: 400,
            errors: 'Invalid authorization code',
          }),
        );

      await expect(
        oauthProvider.sendBatch([{ to: '254700000001', text: 'Hi' }]),
      ).rejects.toThrow('Invalid authorization code');
    });

    it('on 401 with OAuth: refreshes token and retries once', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { authorization_code: 'code-1' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { access_token: 'token-1' },
          }),
        )
        .mockResolvedValueOnce(makeFetchResponse('Unauthorized', 401, false))
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { authorization_code: 'code-2' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse({
            status: true,
            data: { access_token: 'token-2' },
          }),
        )
        .mockResolvedValueOnce(
          makeFetchResponse(makeUwaziiResponse({ '254700000001': 'ref-ok' })),
        );

      const results = await oauthProvider.sendBatch([
        { to: '254700000001', text: 'Hi' },
      ]);

      expect(results[0].accepted).toBe(true);
      expect(results[0].ref).toBe('ref-ok');
      expect(fetchSpy).toHaveBeenCalledTimes(6);
      const calls = sendCalls(fetchSpy);
      expect(calls).toHaveLength(2);
      expect(
        (calls[1][1] as RequestInit).headers as Record<string, string>,
      ).toMatchObject({ 'X-Access-Token': 'token-2' });
    });
  });

  describe('static utilities', () => {
    describe('extractApiError', () => {
      it('returns errors field from JSON body', () => {
        expect(
          UwaziiProvider.extractApiError(
            JSON.stringify({ status: false, errors: 'no_active_aggregator' }),
            400,
          ),
        ).toBe('no_active_aggregator');
      });

      it('falls back to HTTP status for plain-text bodies', () => {
        expect(UwaziiProvider.extractApiError('Server error', 500)).toBe(
          'HTTP 500',
        );
      });
    });

    describe('lookupPhoneEntries', () => {
      it('matches by digits when formatting differs', () => {
        const map = {
          '254700000001': [{ id_state: 'ref-1' }],
        };
        expect(
          UwaziiProvider.lookupPhoneEntries(map, '+254 700 000 001'),
        ).toEqual([{ id_state: 'ref-1' }]);
      });
    });

    describe('normalizePhone', () => {
      it('leaves 254XXXXXXXXXX (12 digits) unchanged', () => {
        expect(UwaziiProvider.normalizePhone('254712345678')).toBe(
          '254712345678',
        );
      });

      it('normalises 0XXXXXXXXX (10 digits) → 254XXXXXXXXX', () => {
        expect(UwaziiProvider.normalizePhone('0712345678')).toBe(
          '254712345678',
        );
      });

      it('normalises 7XXXXXXXX (9 digits starting with 7) → 254XXXXXXXXX', () => {
        expect(UwaziiProvider.normalizePhone('712345678')).toBe('254712345678');
      });

      it('normalises 1XXXXXXXX (9 digits starting with 1) → 2541XXXXXXXX', () => {
        expect(UwaziiProvider.normalizePhone('112345678')).toBe('254112345678');
      });

      it('strips non-digit characters before normalising', () => {
        expect(UwaziiProvider.normalizePhone('+254 712 345 678')).toBe(
          '254712345678',
        );
      });

      it('returns null for too-short numbers', () => {
        expect(UwaziiProvider.normalizePhone('12345')).toBeNull();
      });

      it('returns null for empty string', () => {
        expect(UwaziiProvider.normalizePhone('')).toBeNull();
      });

      it('returns null for numbers that do not match any known format', () => {
        expect(UwaziiProvider.normalizePhone('07123456789')).toBeNull();
      });
    });
  });
});
