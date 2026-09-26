import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as request from 'supertest';
import { MilestoneTypesController } from '../milestone-types.controller';
import { MilestonesService } from '../../application/milestones.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../users/domain/user';

const DATE = new Date('2026-01-01T00:00:00Z');
const TYPE_ID = '00000000-0000-4000-8000-000000000010';

const makeType = (overrides = {}) => ({
  id: TYPE_ID,
  name: 'Baptism',
  description: 'Water baptism',
  createdAt: DATE,
  updatedAt: DATE,
  ...overrides,
});

const mockMilestonesService = () => ({
  findAllTypes: jest.fn(),
  createType: jest.fn(),
  updateType: jest.fn(),
  deleteType: jest.fn(),
});

const allowAllGuard = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: unknown }>();
    req.user = {
      id: '00000000-0000-4000-8000-000000000001',
      role: UserRole.SUPER_ADMIN,
    };
    return true;
  },
};

describe('MilestoneTypesController', () => {
  let app: INestApplication;
  let service: ReturnType<typeof mockMilestonesService>;

  beforeEach(async () => {
    service = mockMilestonesService();

    const module = await Test.createTestingModule({
      controllers: [MilestoneTypesController],
      providers: [{ provide: MilestonesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowAllGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(() => app.close());

  describe('GET /milestone-types', () => {
    it('returns 200 with milestone types', async () => {
      service.findAllTypes.mockResolvedValue([makeType()]);

      await request(app.getHttpServer())
        .get('/milestone-types')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(1);
          expect(res.body[0].name).toBe('Baptism');
        });
    });
  });

  describe('POST /milestone-types', () => {
    it('returns 201 on successful creation', async () => {
      service.createType.mockResolvedValue(makeType());

      await request(app.getHttpServer())
        .post('/milestone-types')
        .send({ name: 'Baptism' })
        .expect(201);
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/milestone-types')
        .send({})
        .expect(400);
    });
  });

  describe('DELETE /milestone-types/:id', () => {
    it('returns 204 with no body on successful deletion', async () => {
      service.deleteType.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/milestone-types/${TYPE_ID}`)
        .expect(204);
    });

    it('returns 409 when the type is still referenced by members', async () => {
      service.deleteType.mockRejectedValue(
        new HttpException(
          'Cannot delete a milestone type that has been recorded against members',
          HttpStatus.CONFLICT,
        ),
      );

      await request(app.getHttpServer())
        .delete(`/milestone-types/${TYPE_ID}`)
        .expect(409);
    });
  });
});
