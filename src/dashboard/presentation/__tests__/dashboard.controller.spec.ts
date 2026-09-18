import { Test } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { DashboardController } from '../dashboard.controller';
import { DashboardService } from '../../application/dashboard.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { UserRole } from '../../../users/domain/user';

const mockDashboardService = () => ({
  getStats: jest.fn(),
});

const allowAllGuard = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: unknown }>();
    req.user = {
      id: '00000000-0000-4000-8000-000000000001',
      role: UserRole.STAFF,
    };
    return true;
  },
};

describe('DashboardController', () => {
  let app: INestApplication;
  let service: ReturnType<typeof mockDashboardService>;

  beforeEach(async () => {
    service = mockDashboardService();

    const module = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(() => app.close());

  describe('GET /dashboard/stats', () => {
    it('returns 200 with the aggregated stats, including follow-ups', async () => {
      const stats = {
        members: {
          total: 10,
          active: 8,
          inactive: 2,
          firstTimeVisitors: 3,
          byStatus: { guest: 3, member: 6, leader: 1 },
          byType: { adult: 9, child: 1 },
        },
        fellowships: { total: 2, active: 2, inactive: 0 },
        departments: { total: 4 },
        attendance: { totalSessions: 1, lastSession: null },
        messaging: {
          totalMessages: 0,
          sent: 0,
          drafts: 0,
          totalDeliveries: 0,
          delivered: 0,
        },
        inventory: {
          totalItems: 0,
          lowStockItems: 0,
          pendingDamageReports: 0,
        },
        followUps: {
          open: 5,
          overdue: 1,
          completed: 2,
          unassigned: 1,
          completionRate: 29,
          recentAttempts: [],
        },
      };
      service.getStats.mockResolvedValue(stats);

      await request(app.getHttpServer())
        .get('/dashboard/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body.members.firstTimeVisitors).toBe(3);
          expect(res.body.followUps.open).toBe(5);
          expect(res.body.followUps.completionRate).toBe(29);
        });
    });
  });
});
