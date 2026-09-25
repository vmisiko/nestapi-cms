import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RetentionService } from '../retention.service';
import { MemberEntity } from '../../../members/infrastructure/member.entity';
import { MemberStatusHistoryEntity } from '../../../members/infrastructure/member-status-history.entity';
import { AttendanceRecordEntity } from '../../../attendance/infrastructure/attendance-record.entity';
import { AttendanceSessionEntity } from '../../../attendance/infrastructure/attendance-session.entity';
import { FollowUpEntity } from '../../../follow-ups/infrastructure/follow-up.entity';
import { DepartmentEntity } from '../../../departments/infrastructure/department.entity';
import { FellowshipEntity } from '../../../fellowships/infrastructure/fellowship.entity';

const makeQb = (terminal: Partial<Record<string, unknown>> = {}) => {
  const qb: Record<string, jest.Mock> = {};
  const self = () => qb;
  for (const method of [
    'select',
    'addSelect',
    'where',
    'andWhere',
    'groupBy',
    'orderBy',
    'innerJoin',
    'leftJoin',
    'limit',
    'setParameter',
  ]) {
    qb[method] = jest.fn(self);
  }
  qb.getRawMany = jest.fn().mockResolvedValue(terminal.getRawMany ?? []);
  qb.getRawOne = jest.fn().mockResolvedValue(terminal.getRawOne ?? null);
  return qb;
};

describe('RetentionService', () => {
  let service: RetentionService;
  let memberOrm: {
    createQueryBuilder: jest.Mock;
    manager: { query: jest.Mock };
  };
  let followUpOrm: { createQueryBuilder: jest.Mock };
  let statusHistoryOrm: { manager: { query: jest.Mock } };

  const emptyRepo = () => ({
    createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
  });

  beforeEach(async () => {
    memberOrm = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValue(
          makeQb({ getRawOne: { eligible: '10', retained: '4' } }),
        ),
      manager: { query: jest.fn().mockResolvedValue([]) },
    };
    followUpOrm = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValue(
          makeQb({ getRawOne: { total: '20', completed: '15' } }),
        ),
    };
    statusHistoryOrm = {
      manager: {
        query: jest.fn().mockResolvedValue([{ total: '5', converted: '3' }]),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        RetentionService,
        { provide: getRepositoryToken(MemberEntity), useValue: memberOrm },
        {
          provide: getRepositoryToken(MemberStatusHistoryEntity),
          useValue: statusHistoryOrm,
        },
        { provide: getRepositoryToken(FollowUpEntity), useValue: followUpOrm },
        {
          provide: getRepositoryToken(DepartmentEntity),
          useValue: emptyRepo(),
        },
        {
          provide: getRepositoryToken(FellowshipEntity),
          useValue: emptyRepo(),
        },
        {
          provide: getRepositoryToken(AttendanceRecordEntity),
          useValue: emptyRepo(),
        },
        {
          provide: getRepositoryToken(AttendanceSessionEntity),
          useValue: emptyRepo(),
        },
      ],
    }).compile();

    service = module.get(RetentionService);
  });

  describe('getStats', () => {
    it('computes cohort retention rates from eligible/retained counts', async () => {
      const stats = await service.getStats({});

      expect(stats.cohortRetention.d30).toEqual({
        eligible: 10,
        retained: 4,
        rate: 40,
      });
      expect(stats.cohortRetention.d60).toEqual(stats.cohortRetention.d30);
      expect(stats.cohortRetention.d90).toEqual(stats.cohortRetention.d30);
    });

    it('computes follow-up completion rate from total/completed counts', async () => {
      const stats = await service.getStats({});

      expect(stats.followUpCompletion).toEqual({
        total: 20,
        completed: 15,
        rate: 75,
      });
    });

    it('includes a documented note on the guest conversion metric', async () => {
      const stats = await service.getStats({});

      expect(stats.guestConversion.note).toContain('member_status_history');
    });

    it('computes guest conversion from member_status_history, not current status', async () => {
      const stats = await service.getStats({});

      expect(stats.guestConversion).toEqual({
        total: 5,
        converted: 3,
        rate: 60,
        note: expect.any(String),
      });
      expect(statusHistoryOrm.manager.query).toHaveBeenCalled();
      const [sql] = statusHistoryOrm.manager.query.mock.calls[0] as [string];
      expect(sql).toContain('from_status IS NULL');
      expect(sql).toContain("to_status = 'guest'");
    });

    it('passes from/to as query parameters, not interpolated into the SQL', async () => {
      await service.getStats({ from: '2026-01-01', to: '2026-02-01' });

      const call = statusHistoryOrm.manager.query.mock.calls.find(
        (c: unknown[]) => (c[0] as string).includes('WITH starts AS'),
      ) as [string, unknown[]];
      expect(call[1]).toEqual(['2026-01-01', '2026-02-01']);
      expect(call[0]).not.toContain('2026-01-01');
    });

    it('returns a 6-point monthly trend', async () => {
      const stats = await service.getStats({});

      expect(stats.trend).toHaveLength(6);
      expect(stats.trend[0]).toEqual(
        expect.objectContaining({ month: expect.any(String), rate: 40 }),
      );
    });

    it('returns zero rates when there is no eligible cohort', async () => {
      memberOrm.createQueryBuilder.mockReturnValue(
        makeQb({ getRawOne: { eligible: '0', retained: '0' } }),
      );

      const stats = await service.getStats({});

      expect(stats.cohortRetention.d30.rate).toBe(0);
    });

    it('reports a trend month with no eligible cohort as null, not 0%', async () => {
      // A cohort summary card (d30/d60/d90) legitimately shows 0% for zero
      // eligible members, but the monthly trend chart must be able to tell
      // "no cohort yet" apart from "cohort retained nobody" — otherwise a
      // month like the current one (too recent to have 30-day-old members)
      // reads as a 0% retention dip instead of missing data.
      memberOrm.createQueryBuilder.mockReturnValue(
        makeQb({ getRawOne: { eligible: '0', retained: '0' } }),
      );

      const stats = await service.getStats({});

      expect(stats.trend).toHaveLength(6);
      for (const point of stats.trend) {
        expect(point.eligible).toBe(0);
        expect(point.rate).toBeNull();
      }
    });

    it('skips department/fellowship breakdowns when no filter is given', async () => {
      const stats = await service.getStats({});

      expect(stats.departmentBreakdown).toBeUndefined();
      expect(stats.fellowshipBreakdown).toBeUndefined();
    });
  });

  describe('getAtRiskMembers', () => {
    it('returns paginated at-risk members from the raw query', async () => {
      memberOrm.manager.query
        .mockResolvedValueOnce([
          { id: 'm1', firstName: 'Jane', lastName: 'Doe', reason: 'inactive' },
        ])
        .mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.getAtRiskMembers(1, 20);

      expect(result).toEqual({
        members: [
          { id: 'm1', firstName: 'Jane', lastName: 'Doe', reason: 'inactive' },
        ],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(memberOrm.manager.query).toHaveBeenCalledTimes(2);
    });

    it('defaults to an empty result set when nothing qualifies', async () => {
      memberOrm.manager.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getAtRiskMembers();

      expect(result.members).toEqual([]);
      expect(result.total).toBe(0);
    });
  });
});
