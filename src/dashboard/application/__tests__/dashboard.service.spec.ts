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
    'addOrderBy',
    'innerJoin',
    'leftJoin',
    'having',
    'limit',
    'setParameter',
  ]) {
    qb[method] = jest.fn(self);
  }
  qb.getRawMany = jest.fn().mockResolvedValue(terminal.getRawMany ?? []);
  qb.getCount = jest.fn().mockResolvedValue(terminal.getCount ?? 0);
  qb.getOne = jest.fn().mockResolvedValue(terminal.getOne ?? null);
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
  let fellowshipOrm: ReturnType<typeof emptyRepo>;
  let departmentOrm: ReturnType<typeof emptyRepo>;
  let messageOrm: ReturnType<typeof emptyRepo>;
  let deliveryOrm: ReturnType<typeof emptyRepo>;

  beforeEach(async () => {
    fellowshipOrm = emptyRepo();
    departmentOrm = emptyRepo();
    messageOrm = emptyRepo();
    deliveryOrm = emptyRepo();
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
          useValue: fellowshipOrm,
        },
        {
          provide: getRepositoryToken(DepartmentEntity),
          useValue: departmentOrm,
        },
        {
          provide: getRepositoryToken(AttendanceSessionEntity),
          useValue: emptyRepo(),
        },
        {
          provide: getRepositoryToken(AttendanceRecordEntity),
          useValue: emptyRepo(),
        },
        { provide: getRepositoryToken(MessageEntity), useValue: messageOrm },
        {
          provide: getRepositoryToken(MessageDeliveryEntity),
          useValue: deliveryOrm,
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
      expect(stats).toHaveProperty('attention');
    });

    it('returns empty, well-formed widget data when the database is empty', async () => {
      const stats = await service.getStats();

      expect(stats.members.byAgeGroup).toEqual({});
      expect(stats.members.byGender).toEqual({
        male: 0,
        female: 0,
        unspecified: 0,
      });
      expect(stats.fellowships.zones).toEqual([]);
      expect(stats.messaging.recent).toEqual([]);
      expect(stats.attention).toEqual({
        lowStock: [],
        pendingDamage: [],
        fellowshipsWithoutLeader: [],
        departmentsBelowTarget: [],
      });
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

  describe('member demographics', () => {
    it('breaks members down by age group and gender and counts online and international', async () => {
      memberOrm.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: [
            {
              activityStatus: 'active',
              status: 'member',
              memberType: 'adult',
              ageGroup: '26_35',
              gender: 'Female',
              isOnline: true,
              isInternational: false,
              count: '3',
            },
            {
              activityStatus: 'active',
              status: 'guest',
              memberType: 'adult',
              ageGroup: null,
              gender: null,
              isOnline: false,
              isInternational: true,
              count: '2',
            },
          ],
        }),
      );

      const stats = await service.getStats();

      expect(stats.members.byAgeGroup).toEqual({ '26_35': 3, unknown: 2 });
      expect(stats.members.byGender).toEqual({
        male: 0,
        female: 3,
        unspecified: 2,
      });
      expect(stats.members.online).toBe(3);
      expect(stats.members.international).toBe(2);
    });
  });

  describe('messaging stats', () => {
    it('splits deliveries by status and reports the delivery rate of recent messages', async () => {
      // messageOrm is queried twice, in order: message status counts, then the recent list.
      messageOrm.createQueryBuilder
        .mockReturnValueOnce(
          makeQb({ getRawMany: [{ status: 'sent', count: '2' }] }),
        )
        .mockReturnValueOnce(
          makeQb({
            getRawMany: [
              {
                id: 'm1',
                title: 'Sunday reminder',
                type: 'reminder',
                targetGroup: 'all',
                sentAt: new Date('2026-09-14T08:00:00Z'),
                total: '10',
                delivered: '9',
              },
              {
                id: 'm2',
                title: 'Draft with no deliveries',
                type: 'alert',
                targetGroup: 'zone',
                sentAt: null,
                total: '0',
                delivered: '0',
              },
            ],
          }),
        );
      deliveryOrm.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: [
            { status: 'delivered', count: '8' },
            { status: 'sent', count: '1' },
            { status: 'pending', count: '2' },
            { status: 'failed', count: '1' },
          ],
        }),
      );

      const stats = await service.getStats();

      expect(stats.messaging).toMatchObject({
        sent: 2,
        totalDeliveries: 12,
        delivered: 8,
        sentDeliveries: 1,
        pendingDeliveries: 2,
        failedDeliveries: 1,
      });
      expect(stats.messaging.recent.map((m) => m.deliveryRate)).toEqual([
        90, 0,
      ]);
      expect(stats.messaging.recent[0]).toMatchObject({
        id: 'm1',
        title: 'Sunday reminder',
        type: 'reminder',
        targetGroup: 'all',
      });
    });
  });

  describe('fellowship zones and attention lists', () => {
    it('rolls fellowships up per zone with numeric counts and meeting days', async () => {
      // fellowshipOrm is queried in order: status counts, zone rollup, fellowships without a leader.
      fellowshipOrm.createQueryBuilder
        .mockReturnValueOnce(
          makeQb({ getRawMany: [{ status: 'active', count: '3' }] }),
        )
        .mockReturnValueOnce(
          makeQb({
            getRawMany: [
              {
                id: 'z1',
                name: 'Central',
                fellowshipCount: '3',
                activeFellowships: '2',
                memberCount: '40',
                meetingDays: ['Friday', 'Wednesday'],
              },
              {
                id: 'z2',
                name: 'Eastlands',
                fellowshipCount: '1',
                activeFellowships: '1',
                memberCount: '0',
                meetingDays: null,
              },
            ],
          }),
        )
        .mockReturnValueOnce(
          makeQb({
            getRawMany: [{ id: 'f9', name: "Lang'ata", zoneName: 'Central' }],
          }),
        );

      const stats = await service.getStats();

      expect(stats.fellowships.zones).toEqual([
        {
          id: 'z1',
          name: 'Central',
          fellowshipCount: 3,
          activeFellowships: 2,
          memberCount: 40,
          meetingDays: ['Friday', 'Wednesday'],
        },
        {
          id: 'z2',
          name: 'Eastlands',
          fellowshipCount: 1,
          activeFellowships: 1,
          memberCount: 0,
          meetingDays: [],
        },
      ]);
      expect(stats.attention.fellowshipsWithoutLeader).toEqual([
        { id: 'f9', name: "Lang'ata", zoneName: 'Central' },
      ]);
    });

    it('lists departments below their member target with numeric counts', async () => {
      departmentOrm.createQueryBuilder.mockReturnValue(
        makeQb({
          getRawMany: [
            { id: 'd1', name: 'Media', target: 30, memberCount: '14' },
          ],
        }),
      );

      const stats = await service.getStats();

      expect(stats.attention.departmentsBelowTarget).toEqual([
        { id: 'd1', name: 'Media', target: 30, memberCount: 14 },
      ]);
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
