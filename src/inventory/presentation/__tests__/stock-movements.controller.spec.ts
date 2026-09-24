import { Test } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';
import { StockMovementsController } from '../stock-movements.controller';
import { InventoryService } from '../../application/inventory.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { UserRole } from '../../../users/domain/user';

const mockInventoryService = () => ({
  findAllMovements: jest.fn(),
});

function makeAuthGuard(role: UserRole) {
  return {
    canActivate: (ctx: ExecutionContext) => {
      const req = ctx.switchToHttp().getRequest<{ user: unknown }>();
      req.user = { id: '00000000-0000-4000-8000-000000000001', role };
      return true;
    },
  };
}

async function buildApp(
  role: UserRole,
  service: ReturnType<typeof mockInventoryService>,
): Promise<INestApplication> {
  // RolesGuard is intentionally left un-overridden: it runs for real, so
  // these tests exercise the actual @Roles(SUPER_ADMIN, ADMIN) enforcement
  // on this controller, not a stub.
  const module = await Test.createTestingModule({
    controllers: [StockMovementsController],
    providers: [{ provide: InventoryService, useValue: service }, Reflector],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue(makeAuthGuard(role))
    .compile();

  const app = module.createNestApplication();
  await app.init();
  return app;
}

describe('StockMovementsController RBAC', () => {
  let service: ReturnType<typeof mockInventoryService>;
  let app: INestApplication;

  beforeEach(() => {
    service = mockInventoryService();
    service.findAllMovements.mockResolvedValue([]);
  });

  afterEach(() => app?.close());

  it.each([UserRole.SUPER_ADMIN, UserRole.ADMIN])(
    'allows %s to list stock movements',
    async (role) => {
      app = await buildApp(role, service);
      await request(app.getHttpServer())
        .get('/inventory/stock-movements')
        .expect(200);
    },
  );

  it('denies staff (403) from listing stock movements', async () => {
    app = await buildApp(UserRole.STAFF, service);
    await request(app.getHttpServer())
      .get('/inventory/stock-movements')
      .expect(403);
    expect(service.findAllMovements).not.toHaveBeenCalled();
  });
});
