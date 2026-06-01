import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as request from 'supertest';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from '../application/departments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../users/domain/user';
import { makeDepartment } from '../../test/fixtures';

const mockDepartmentsService = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
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

describe('DepartmentsController', () => {
  let app: INestApplication;
  let service: ReturnType<typeof mockDepartmentsService>;

  beforeEach(async () => {
    service = mockDepartmentsService();

    const module = await Test.createTestingModule({
      controllers: [DepartmentsController],
      providers: [{ provide: DepartmentsService, useValue: service }],
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

  describe('GET /departments', () => {
    it('returns 200 with array of departments', async () => {
      service.findAll.mockResolvedValue([makeDepartment()]);

      await request(app.getHttpServer())
        .get('/departments')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(1);
          expect(res.body[0].name).toBe('Worship Department');
        });
    });
  });

  describe('GET /departments/:id', () => {
    it('returns 200 with the department', async () => {
      const dept = makeDepartment();
      service.findById.mockResolvedValue(dept);

      await request(app.getHttpServer())
        .get(`/departments/${dept.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(dept.id);
          expect(res.body.name).toBe(dept.name);
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .get('/departments/not-a-uuid')
        .expect(400);
    });

    it('returns 404 when department not found', async () => {
      service.findById.mockRejectedValue(
        new HttpException('Department not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .get('/departments/00000000-0000-4000-8000-000000000099')
        .expect(404);
    });
  });

  describe('POST /departments', () => {
    const validPayload = {
      name: 'Media Department',
      memberTarget: 15,
      annualBudget: 3000,
    };

    it('returns 201 with created department', async () => {
      const dept = makeDepartment({ name: 'Media Department' });
      service.create.mockResolvedValue(dept);

      await request(app.getHttpServer())
        .post('/departments')
        .send(validPayload)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Media Department');
        });
    });

    it('returns 400 when name is too short', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .send({ name: 'X' })
        .expect(400);
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .send({})
        .expect(400);
    });

    it('returns 400 when memberTarget is negative', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .send({ name: 'Media Department', memberTarget: -5 })
        .expect(400);
    });

    it('returns 400 when headId is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/departments')
        .send({ name: 'Media Department', headId: 'not-a-uuid' })
        .expect(400);
    });
  });

  describe('PATCH /departments/:id', () => {
    it('returns 200 with updated department', async () => {
      const dept = makeDepartment({ memberTarget: 30 });
      service.update.mockResolvedValue(dept);

      await request(app.getHttpServer())
        .patch(`/departments/${dept.id}`)
        .send({ memberTarget: 30 })
        .expect(200)
        .expect((res) => {
          expect(res.body.memberTarget).toBe(30);
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .patch('/departments/invalid')
        .send({ name: 'Updated' })
        .expect(400);
    });

    it('returns 404 when department not found', async () => {
      service.update.mockRejectedValue(
        new HttpException('Department not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .patch('/departments/00000000-0000-4000-8000-000000000099')
        .send({ name: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /departments/:id', () => {
    it('returns 204 with no body', async () => {
      service.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/departments/00000000-0000-4000-8000-000000000001')
        .expect(204)
        .expect((res) => {
          expect(res.text).toBe('');
        });
    });

    it('returns 404 when department not found', async () => {
      service.delete.mockRejectedValue(
        new HttpException('Department not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .delete('/departments/00000000-0000-4000-8000-000000000099')
        .expect(404);
    });
  });
});
