import { ConfigService } from '@nestjs/config';
import { UwaziiProvider } from '../uwazii.provider';

// ---------------------------------------------------------------------------
// ConfigService mock
// ---------------------------------------------------------------------------

function makeConfigService(
  overrides: Record<string, string> = {},
): ConfigService {
  const defaults: Record<string, string> = {
    UWAZII_BASE_URL: 'https://api.uwazii.test',
    UWAZII_ACCESS_TOKEN: 'test-token',
    UWAZII_FROM: 'TestSender',
    UWAZII_CALLBACK_URL: 'https://cms.test/dlr',
    ...overrides,
  };

  return {
    get: jest.fn((key: string, fallback?: string) => defaults[key] ?? fallback),
    getOrThrow: jest.fn((key: string) => {
      if (defaults[key] === undefined) {
        throw new Error(`Config key ${key} not found`);
      }
      return defaults[key];
    }),
  } as unknown as ConfigService;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProvider(configOverrides: Record<string, string> = {}): UwaziiProvider {
  return new UwaziiProvider(makeConfigService(configOverrides));
}

/** Build a minimal fetch Response */
function makeFetchResponse(
  body: unknown,
  status = 200,
  ok = true,
): Response {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(String(body)),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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

  // -------------------------------------------------------------------------
  // sendBatch — empty input
  // -------------------------------------------------------------------------
  describe('sendBatch', () => {
    it('returns [] without calling fetch when given an empty array', async () => {
      const result = await provider.sendBatch([]);
      expect(result).toEqual([]);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('calls fetch with correct URL, Authorization header, and body', async () => {
      const apiResponse = {
        messages: [{ to: '254700000001', id: 'ref-001', status: 'accepted' }],
      };
      fetchSpy.mockResolvedValue(makeFetchResponse(apiResponse));

      await provider.sendBatch([{ to: '254700000001', text: 'Hello' }]);

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://api.uwazii.test/v1/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('"from":"TestSender"'),
        }),
      );
    });

    it('includes callback_url in the request body', async () => {
      fetchSpy.mockResolvedValue(makeFetchResponse({ messages: [] }));

      await provider.sendBatch([{ to: '254700000001', text: 'Hi' }]);

      const call = fetchSpy.mock.calls[0];
      const bodyParsed = JSON.parse((call[1] as RequestInit).body as string);
      expect(bodyParsed.callback_url).toBe('https://cms.test/dlr');
    });

    // -----------------------------------------------------------------------
    // Accepted messages
    // -----------------------------------------------------------------------
    it('parses accepted messages: accepted=true and extracts ref from "id" field', async () => {
      const apiResponse = {
        messages: [
          { to: '254700000001', id: 'uwazii-ref-abc', status: 'accepted' },
        ],
      };
      fetchSpy.mockResolvedValue(makeFetchResponse(apiResponse));

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hello' },
      ]);

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        to: '254700000001',
        ref: 'uwazii-ref-abc',
        accepted: true,
        reason: null,
      });
    });

    it('accepts response body under "data" key as well as "messages"', async () => {
      const apiResponse = {
        data: [{ to: '254700000001', id: 'ref-data', status: 'accepted' }],
      };
      fetchSpy.mockResolvedValue(makeFetchResponse(apiResponse));

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hello' },
      ]);

      expect(results[0].ref).toBe('ref-data');
      expect(results[0].accepted).toBe(true);
    });

    it('returns accepted=true with null ref when phone not in API response', async () => {
      // API returns empty messages (minimal response)
      fetchSpy.mockResolvedValue(makeFetchResponse({ messages: [] }));

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

    // -----------------------------------------------------------------------
    // Rejected messages
    // -----------------------------------------------------------------------
    it('parses rejected messages: accepted=false, reason from error field', async () => {
      const apiResponse = {
        messages: [
          { to: '254700000001', id: null, status: 'rejected', error: 'Invalid MSISDN' },
        ],
      };
      fetchSpy.mockResolvedValue(makeFetchResponse(apiResponse));

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hello' },
      ]);

      expect(results[0]).toMatchObject({
        to: '254700000001',
        accepted: false,
        reason: 'Invalid MSISDN',
      });
    });

    it('parses "failed" status as accepted=false with fallback reason "rejected"', async () => {
      const apiResponse = {
        messages: [
          { to: '254700000001', status: 'failed' },
        ],
      };
      fetchSpy.mockResolvedValue(makeFetchResponse(apiResponse));

      const results = await provider.sendBatch([
        { to: '254700000001', text: 'Hello' },
      ]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].reason).toBe('rejected');
    });

    // -----------------------------------------------------------------------
    // HTTP error response
    // -----------------------------------------------------------------------
    it('returns failed results for all messages when API returns non-2xx status', async () => {
      fetchSpy.mockResolvedValue(makeFetchResponse('Unauthorized', 401, false));

      const messages = [
        { to: '254700000001', text: 'Hi' },
        { to: '254700000002', text: 'Hi' },
      ];
      const results = await provider.sendBatch(messages);

      expect(results).toHaveLength(2);
      results.forEach((r) => {
        expect(r.accepted).toBe(false);
        expect(r.reason).toBe('HTTP 401');
        expect(r.ref).toBeNull();
      });
    });

    // -----------------------------------------------------------------------
    // Network error (fetch throws)
    // -----------------------------------------------------------------------
    it('returns failed results for all messages when fetch throws a network error', async () => {
      fetchSpy.mockRejectedValue(new Error('Network unreachable'));

      const messages = [
        { to: '254700000001', text: 'Hello' },
        { to: '254700000002', text: 'Hello' },
      ];
      const results = await provider.sendBatch(messages);

      expect(results).toHaveLength(2);
      results.forEach((r) => {
        expect(r.accepted).toBe(false);
        expect(r.reason).toBe('Network unreachable');
        expect(r.ref).toBeNull();
      });
    });

    it('returns failed results with "Unknown error" when fetch throws a non-Error value', async () => {
      fetchSpy.mockRejectedValue('connection refused');

      const results = await provider.sendBatch([{ to: '254700000001', text: 'Hi' }]);

      expect(results[0].accepted).toBe(false);
      expect(results[0].reason).toBe('Unknown error');
    });
  });

  // -------------------------------------------------------------------------
  // normalizePhone — static method
  // -------------------------------------------------------------------------
  describe('normalizePhone', () => {
    it('leaves 254XXXXXXXXXX (12 digits) unchanged', () => {
      expect(UwaziiProvider.normalizePhone('254712345678')).toBe('254712345678');
    });

    it('normalises 0XXXXXXXXX (10 digits) → 254XXXXXXXXX', () => {
      expect(UwaziiProvider.normalizePhone('0712345678')).toBe('254712345678');
    });

    it('normalises 7XXXXXXXX (9 digits starting with 7) → 254XXXXXXXXX', () => {
      expect(UwaziiProvider.normalizePhone('712345678')).toBe('254712345678');
    });

    it('normalises 1XXXXXXXX (9 digits starting with 1) → 2541XXXXXXXX', () => {
      expect(UwaziiProvider.normalizePhone('112345678')).toBe('254112345678');
    });

    it('strips non-digit characters before normalising', () => {
      expect(UwaziiProvider.normalizePhone('+254 712 345 678')).toBe('254712345678');
    });

    it('strips dashes and spaces', () => {
      expect(UwaziiProvider.normalizePhone('0712-345-678')).toBe('254712345678');
    });

    it('returns null for too-short numbers', () => {
      expect(UwaziiProvider.normalizePhone('12345')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(UwaziiProvider.normalizePhone('')).toBeNull();
    });

    it('returns null for numbers that do not match any known prefix/length', () => {
      // 11-digit number that starts with 0 — wrong length
      expect(UwaziiProvider.normalizePhone('07123456789')).toBeNull();
    });
  });
});
