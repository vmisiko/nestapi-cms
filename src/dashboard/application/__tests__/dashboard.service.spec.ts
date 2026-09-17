import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from '../dashboard.service';
import { MemberEntity } from '../../../members/infrastructure/member.entity';
import { FellowshipEntity } from '../../../fellowships/infrastructure/fellowship.entity';
import { DepartmentEntity } from '../../../departments/infrastructure/department.entity';
import { AttendanceSessionEntity } from '../../../attendance/infrastructure/attendance-session.entity';
import { AttendanceRecordEntity } from '../../../attendance/infrastructure/attendance-record.entity';
import { MessageEntity } from '../../../messaging/infrastructure/message.entity';
import { MessageDeliveryEntity } from '../../../messaging/infrastructure/message-delivery.entity';
import { InventoryItemEntity } from '../../../inventory/infrastructure/inventory-item.entity';
import { DamageReportEntity } from '../../../inventory/infrastructure/damage-report.entity';
import { FollowUpEntity } from '../../../follow-ups/infrastructure/follow-up.entity';
import { FollowUpAttemptEntity } from '../../../follow-ups/infrastructure/follow-up-attempt.entity';

// A minimal chainable query-builder mock: every method returns itself so
// calls can be chained in any order, with a configurable terminal result.
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
    'limit',
    'setParameter',
  ]) {
    qb[method] = jest.fn(self);
  }
  qb.getRawMany = jest.fn().mockResolvedValue(terminal.getRawMany ?? []);
  qb.getCount = jest.fn().mockResolvedValue(terminal.getCount ?? 0);
  return qb;
};

describe('DashboardService', () => {
  let service: DashboardService;
  let memberOrm: {
    createQueryBuilder: jest.Mock;
    count: jest.Mock;
  };
  let followUpOrm: { createQueryBuilder: jest.Mock; count: jest.Mock };
  let followUpAttemptOrm: { createQueryBuilder: jest.Mock };

  const emptyRepo = () => ({
    createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
    count: jest.fn().mockResolvedValue(0),
    findOne: jest.fn().mockResolvedValue(null),
  });

  beforeEach(async () => {
    memberOrm = { createQueryBuilder: jest.fn(), count: jest.fn() };
    followUpOrm = { createQueryBuilder: jest.fn(), count: jest.fn() };
    followUpAttemptOrm = { createQueryBuilder: jest.fn() };

    // Sensible defaults so a test that only cares about one section
    // doesn't have to stub every repository call it doesn't use.
    memberOrm.createQueryBuilder.mockReturnValue(makeQb({ getRawMany: [] }));
    memberOrm.count.mockResolvedValue(0);
    followUpOrm.count.mockResolvedValue(0);
    followUpOrm.createQueryBuilder.mockReturnValue(makeQb({ getCount: 0 }));
    followUpAttemptOrm.createQueryBuilder.mockReturnValue(
      makeQb({ getRawMany: [] }),
    );

    const module = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(MemberEntity), useValue: memberOrm },
        {
          provide: getRepositoryToken(FellowshipEntity),
          useValue: emptyRepo(),
        },
        {
          provide: getRepositoryToken(DepartmentEntity),
          useValue: emptyRepo(),
        },
        {
          provide: getRepositoryToken(AttendanceSessionEntity),
          useValue: emptyRepo(),
        },
        {
          provide: getRepositoryToken(AttendanceRecordEntity),
          useValue: emptyRepo(),
        },
        { provide: getRepositoryToken(MessageEntity), useValue: emptyRepo() },
        {
          provide: getRepositoryToken(MessageDeliveryEntity),
          useValue: emptyRepo(),
        },
        {
          provide: getRepositoryToken(InventoryItemEntity),
          useValue: emptyRepo(),
        },
        {
          provide: getRepositoryToken(DamageReportEntity),
          useValue: emptyRepo(),
        },
        { provide: getRepositoryToken(FollowUpEntity), useValue: followUpOrm },
        {
          provide: getRepositoryToken(FollowUpAttemptEntity),
          useValue: followUpAttemptOrm,
        },
      ],
    }).compile();

    service = module.get(DashboardService);
  });

  describe('getStats', () => {
    it('assembles every section, including follow-ups', async () => {
      const stats = await service.getStats();

      expect(stats).toHaveProperty('members');
      expect(stats).toHaveProperty('fellowships');
      expect(stats).toHaveProperty('departments');
      expect(stats).toHaveProperty('attendance');
      expect(stats).toHaveProperty('messaging');
      expect(stats).toHaveProperty('inventory');
      expect(stats).toHaveProperty('followUps');
    });
  });

  describe('member stats', () => {
    it('reports the first-time-visitor count alongside the existing breakdowns', async () => {
      memberOrm.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: [
            {
              activityStatus: 'active',
              status: 'guest',
              memberType: 'adult',
              count: '4',
            },
          ],
        }),
      );
      memberOrm.count.mockResolvedValue(3);

      const stats = await service.getStats();

      expect(stats.members.total).toBe(4);
      expect(stats.members.firstTimeVisitors).toBe(3);
    });
  });

  describe('follow-up stats', () => {
    it('reports open, overdue, completed, unassigned and completion rate', async () => {
      followUpOrm.count
        .mockResolvedValueOnce(5) // open
        .mockResolvedValueOnce(2) // completed
        .mockResolvedValueOnce(10); // total
      followUpOrm.createQueryBuilder
        .mockReturnValueOnce(makeQb({ getCount: 1 })) // overdue
        .mockReturnValueOnce(makeQb({ getCount: 3 })); // unassigned

      const stats = await service.getStats();

      expect(stats.followUps).toEqual({
        open: 5,
        overdue: 1,
        completed: 2,
        unassigned: 3,
        completionRate: 20,
        recentAttempts: [],
      });
    });

    it('reports the most recent contact attempts with member and task context', async () => {
      const recentAttempts = [
        {
          id: 'attempt-1',
          taskId: 'task-1',
          taskTitle: 'Welcome visitor',
          memberName: 'Jane Doe',
          contactMethod: 'call',
          outcome: 'connected',
          contactedAt: new Date('2026-09-15T10:00:00Z'),
        },
      ];
      followUpAttemptOrm.createQueryBuilder.mockReturnValue(
        makeQb({ getRawMany: recentAttempts }),
      );

      const stats = await service.getStats();

      expect(stats.followUps.recentAttempts).toEqual(recentAttempts);
    });

    it('reports a zero completion rate when there are no follow-up tasks', async () => {
      const stats = await service.getStats();

      expect(stats.followUps.completionRate).toBe(0);
    });
  });
});
