import { BadRequestException } from '@nestjs/common';
import { VisitorsService } from '../visitors.service';

describe('VisitorsService', () => {
  const countsRow = {
    first_time: '21',
    returning_count: '3',
    total: '24',
    active: '20',
    inactive: '4',
    attendance: '30',
    due: '9',
    overdue: '2',
  };

  const makeService = (windowRows: Record<string, string>[]) => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([countsRow])
      .mockImplementation(() => Promise.resolve([windowRows.shift()]));
    const orm = { manager: { query } };
    return { service: new VisitorsService(orm as never), query };
  };

  it('maps the count row and builds four retention windows', async () => {
    const { service } = makeService([
      { eligible: '10', returned: '4' },
      { eligible: '5', returned: '1' },
      { eligible: '0', returned: '0' },
      { eligible: '0', returned: '0' },
    ]);

    const overview = await service.getOverview('2026-11-08', '2026-11-14');

    expect(overview).toMatchObject({
      from: '2026-11-08',
      to: '2026-11-14',
      totalVisitors: 24,
      firstTimeVisitors: 21,
      returningVisitors: 3,
      totalAttendance: 30,
      activeVisitors: 20,
      inactiveVisitors: 4,
      followUpsDue: 9,
      followUpsOverdue: 2,
    });
    expect(overview.retention).toEqual([
      { week: 1, eligible: 10, returned: 4, rate: 40, available: true },
      { week: 2, eligible: 5, returned: 1, rate: 20, available: true },
      { week: 3, eligible: 0, returned: 0, rate: null, available: false },
      { week: 4, eligible: 0, returned: 0, rate: null, available: false },
    ]);
  });

  it('marks a window nobody has finished as unavailable, not 0%', async () => {
    const { service } = makeService(
      Array(4).fill({ eligible: '0', returned: '0' }),
    );

    const overview = await service.getOverview('2026-11-08', '2026-11-14');

    expect(overview.retention.every((w) => w.rate === null)).toBe(true);
    expect(overview.retention.every((w) => !w.available)).toBe(true);
  });

  it('rounds the rate to one decimal place', async () => {
    const { service } = makeService([
      { eligible: '3', returned: '1' },
      ...Array(3).fill({ eligible: '0', returned: '0' }),
    ]);

    const overview = await service.getOverview('2026-11-08', '2026-11-14');

    expect(overview.retention[0].rate).toBe(33.3);
  });

  it('rejects a range that ends before it starts', async () => {
    const { service, query } = makeService([]);

    await expect(
      service.getOverview('2026-11-14', '2026-11-08'),
    ).rejects.toThrow(BadRequestException);
    expect(query).not.toHaveBeenCalled();
  });

  describe('getRetentionReport', () => {
    const row = (
      id: string,
      first: string,
      weeks: [string, string, string, string],
    ) => ({
      id,
      first_name: first,
      last_name: 'Doe',
      phone: id === 'b' ? null : '0700000000',
      first_visit: '2026-10-04',
      w1: weeks[0],
      w2: weeks[1],
      w3: weeks[2],
      w4: weeks[3],
    });

    it('maps each visitor to four weekly statuses', async () => {
      const query = jest
        .fn()
        .mockResolvedValue([
          row('a', 'Jane', [
            'returned',
            'not_returned',
            'unavailable',
            'unavailable',
          ]),
        ]);
      const service = new VisitorsService({ manager: { query } } as never);

      const report = await service.getRetentionReport(
        '2026-10-01',
        '2026-10-31',
      );

      expect(report.rows).toEqual([
        {
          memberId: 'a',
          name: 'Jane Doe',
          phone: '0700000000',
          firstVisit: '2026-10-04',
          weeks: [
            { week: 1, status: 'returned' },
            { week: 2, status: 'not_returned' },
            { week: 3, status: 'unavailable' },
            { week: 4, status: 'unavailable' },
          ],
        },
      ]);
    });

    it('derives the summary from the same rows and never reports 0% for an unfinished week', async () => {
      const query = jest
        .fn()
        .mockResolvedValue([
          row('a', 'Jane', [
            'returned',
            'returned',
            'unavailable',
            'unavailable',
          ]),
          row('b', 'John', [
            'returned',
            'not_returned',
            'unavailable',
            'unavailable',
          ]),
          row('c', 'Mary', [
            'not_returned',
            'not_returned',
            'unavailable',
            'unavailable',
          ]),
        ]);
      const service = new VisitorsService({ manager: { query } } as never);

      const report = await service.getRetentionReport(
        '2026-10-01',
        '2026-10-31',
      );

      expect(report.summary).toEqual([
        { week: 1, eligible: 3, returned: 2, rate: 66.7, available: true },
        { week: 2, eligible: 3, returned: 1, rate: 33.3, available: true },
        { week: 3, eligible: 0, returned: 0, rate: null, available: false },
        { week: 4, eligible: 0, returned: 0, rate: null, available: false },
      ]);
      expect(report.rows[1].phone).toBeNull();
    });

    it('returns an empty report when nobody registered in the range', async () => {
      const query = jest.fn().mockResolvedValue([]);
      const service = new VisitorsService({ manager: { query } } as never);

      const report = await service.getRetentionReport(
        '2020-01-01',
        '2020-01-31',
      );

      expect(report.rows).toEqual([]);
      expect(report.summary.every((w) => w.rate === null)).toBe(true);
    });

    it('rejects a range that ends before it starts', async () => {
      const query = jest.fn();
      const service = new VisitorsService({ manager: { query } } as never);

      await expect(
        service.getRetentionReport('2026-11-14', '2026-11-08'),
      ).rejects.toThrow(BadRequestException);
      expect(query).not.toHaveBeenCalled();
    });
  });
});
