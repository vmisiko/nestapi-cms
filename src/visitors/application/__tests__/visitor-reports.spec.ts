import { BadRequestException } from '@nestjs/common';
import { buildVisitorFilter } from '../visitor-facts.sql';
import { VisitorReportsService } from '../visitor-reports.service';
import { detectSearchMode, phoneCore } from '../visitor-search.service';

describe('buildVisitorFilter', () => {
  it('returns nothing when no filter is set', () => {
    expect(buildVisitorFilter({}, 3)).toEqual({ sql: '', params: [] });
  });

  it('binds values as parameters numbered from the first free slot', () => {
    const f = buildVisitorFilter(
      { visitorStatus: 'regular', stayType: 'temporary', gender: 'female' },
      3,
    );
    expect(f.params).toEqual(['regular', 'female', 'temporary']);
    expect(f.sql).toContain('v.lifecycle = $3');
    expect(f.sql).toContain('v.gender = $4');
    expect(f.sql).toContain('v.stay_type = $5');
    expect(f.sql.startsWith(' AND ')).toBe(true);
  });

  it('treats "not specified" as anything other than male or female, without a parameter', () => {
    const f = buildVisitorFilter({ gender: 'not_specified' }, 3);
    expect(f.params).toEqual([]);
    expect(f.sql).toContain("NOT IN ('male', 'female')");
  });

  it('filters by follow-up status through the tasks table', () => {
    const f = buildVisitorFilter({ followUpStatus: 'in_progress' }, 3);
    expect(f.params).toEqual(['in_progress']);
    expect(f.sql).toContain('follow_up_tasks');
  });

  it('can skip the follow-up filter for reports that apply it to the task itself', () => {
    const f = buildVisitorFilter({ followUpStatus: 'pending' }, 3, {
      skipFollowUp: true,
    });
    expect(f).toEqual({ sql: '', params: [] });
  });
});

describe('visitor search helpers', () => {
  it('detects a phone number, an id and a name', () => {
    expect(detectSearchMode('0712 345 678')).toBe('phone');
    expect(detectSearchMode('+254712345678')).toBe('phone');
    expect(detectSearchMode('3bf2a1c0-9d4e-4f1a-8b2c-0123456789ab')).toBe('id');
    expect(detectSearchMode('Daisy Akoth')).toBe('name');
    expect(detectSearchMode('Nduwayo')).toBe('name');
  });

  it('matches phone numbers without their local or country prefix', () => {
    expect(phoneCore('0712 345 678')).toBe('712345678');
    expect(phoneCore('+254712345678')).toBe('712345678');
    expect(phoneCore('712345678')).toBe('712345678');
  });
});

describe('VisitorReportsService', () => {
  const visitor = (over: Record<string, string | null> = {}) => ({
    id: 'v1',
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '0700000000',
    gender: 'female',
    stay_type: 'permanent',
    lifecycle: 'new',
    registered: '2026-11-01',
    ...over,
  });

  const make = (rows: Record<string, string | null>[]) => {
    const query = jest.fn().mockResolvedValue(rows);
    return {
      service: new VisitorReportsService({ manager: { query } } as never),
      query,
    };
  };

  it('rejects an unknown report type before touching the database', async () => {
    const { service, query } = make([]);
    await expect(
      service.getReport('nonsense', '2026-11-01', '2026-11-30', {}),
    ).rejects.toThrow(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects a reversed range', async () => {
    const { service } = make([]);
    await expect(
      service.getReport('attendance', '2026-11-30', '2026-11-01', {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('summarises first-time visitors by gender, stay type and status', async () => {
    const { service } = make([
      visitor(),
      visitor({ id: 'v2', gender: 'male', stay_type: 'temporary' }),
      visitor({
        id: 'v3',
        gender: null,
        stay_type: null,
        lifecycle: 'returning',
      }),
    ]);

    const report = await service.getReport(
      'first-time-visitors',
      '2026-11-01',
      '2026-11-30',
      {},
    );
    const summary = Object.fromEntries(
      report.summary.map((s) => [s.label, s.value]),
    );

    expect(report.total).toBe(3);
    expect(summary).toMatchObject({
      Rows: 3,
      Male: 1,
      Female: 1,
      'Not specified': 1,
      Permanent: 1,
      Temporary: 1,
      New: 2,
      Returning: 1,
    });
    expect(summary).not.toHaveProperty('Lost');
  });

  it('previews only the requested number of rows but reports the full total', async () => {
    const { service } = make(
      Array.from({ length: 5 }, (_, i) => visitor({ id: `v${i}` })),
    );

    const report = await service.getReport(
      'first-time-visitors',
      '2026-11-01',
      '2026-11-30',
      { limit: 2 },
    );

    expect(report.rows).toHaveLength(2);
    expect(report.total).toBe(5);
  });

  it('shows a cohort week as unavailable until someone has finished it', async () => {
    const { service } = make([
      {
        month_name: 'November',
        start_d: '2026-11-01',
        end_d: '2026-12-28',
        visitors: '4',
        e1: '4',
        r1: '3',
        e2: '0',
        r2: '0',
        e3: '0',
        r3: '0',
        e4: '0',
        r4: '0',
      },
    ]);

    const report = await service.getReport(
      'cohort',
      '2026-11-01',
      '2026-11-30',
      {},
    );

    expect(report.rows[0]).toMatchObject({
      cohort: 'November Cohort',
      visitors: 4,
      week1: '75% (3 of 4)',
      week2: 'Not yet available',
    });
    expect(report.summary).toEqual([
      { label: 'Rows', value: 1 },
      { label: 'Matching visitors', value: 4 },
    ]);
  });

  it('counts attendance rows per activity in the summary', async () => {
    const { service } = make([
      {
        ...visitor(),
        d: '2026-11-01',
        session_type: 'sunday_service',
        session_id: 's1',
      },
      {
        ...visitor({ id: 'v2' }),
        d: '2026-11-08',
        session_type: 'sunday_service',
        session_id: 's2',
      },
      {
        ...visitor({ id: 'v3' }),
        d: '2026-11-08',
        session_type: 'midweek_service',
        session_id: 's3',
      },
    ]);

    const report = await service.getReport(
      'attendance',
      '2026-11-01',
      '2026-11-30',
      {},
    );
    const summary = Object.fromEntries(
      report.summary.map((s) => [s.label, s.value]),
    );

    expect(summary['Sunday Service']).toBe(2);
    expect(summary['Midweek Service']).toBe(1);
    expect(report.rows[0]).toMatchObject({
      date: '2026-11-01',
      activity: 'Sunday Service',
      activityId: 's1',
    });
  });

  it('passes the filter values after the date range', async () => {
    const { service, query } = make([]);

    await service.getReport('inactive', '2026-11-01', '2026-11-30', {
      gender: 'male',
      visitorStatus: 'lost',
    });

    const [, params] = query.mock.calls[0];
    expect(params).toEqual(['2026-11-01', '2026-11-30', 'lost', 'male']);
  });
});
