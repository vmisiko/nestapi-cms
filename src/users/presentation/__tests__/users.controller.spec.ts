import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import * as request from 'supertest';
import { UsersController } from './users.controller';
import { UsersService } from '../application/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../domain/user';
import { makeUser } from '../../test/user.fixture';

const mockUsersService = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

const allowAllGuard = {
  canActivate: (ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest<{ user: unknown }>();
    req.user = { id: 'uuid-test-1', role: UserRole.SUPER_ADMIN };
    return true;
  },
};

describe('UsersController', () => {
  let app: INestApplication;
  let service: ReturnType<typeof mockUsersService>;

  beforeEach(async () => {
    service = mockUsersService();

    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
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

  describe('GET /users', () => {
    it('returns 200 with array of users', async () => {
      service.findAll.mockResolvedValue([makeUser()]);

      await request(app.getHttpServer())
        .get('/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(1);
          expect(res.body[0]).not.toHaveProperty('passwordHash');
          expect(res.body[0]).not.toHaveProperty('refreshTokenHash');
        });
    });
  });

  describe('GET /users/:id', () => {
    it('returns 200 with the user', async () => {
      const user = makeUser();
      service.findById.mockResolvedValue(user);

      await request(app.getHttpServer())
        .get(`/users/${user.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(user.id);
          expect(res.body.email).toBe(user.email);
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer()).get('/users/not-a-uuid').expect(400);
    });
  });

  describe('POST /users', () => {
    const validPayload = {
      email: 'new@citymega.org',
      password: 'password1',
      role: UserRole.STAFF,
    };

    it('returns 201 with created user', async () => {
      const user = makeUser({ email: validPayload.email });
      service.create.mockResolvedValue(user);

      await request(app.getHttpServer())
        .post('/users')
        .send(validPayload)
        .expect(201)
        .expect((res) => {
          expect(res.body.email).toBe(validPayload.email);
        });
    });

    it('returns 400 when email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ ...validPayload, email: 'not-an-email' })
        .expect(400);
    });

    it('returns 400 when password is too short', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ ...validPayload, password: 'short' })
        .expect(400);
    });

    it('returns 400 when role is invalid', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({ ...validPayload, role: 'god_mode' })
        .expect(400);
    });
  });

  describe('PATCH /users/:id', () => {
    it('returns 200 with updated user', async () => {
      const user = makeUser({ role: UserRole.ADMIN });
      service.update.mockResolvedValue(user);

      await request(app.getHttpServer())
        .patch(`/users/${user.id}`)
        .send({ role: UserRole.ADMIN })
        .expect(200)
        .expect((res) => {
          expect(res.body.role).toBe(UserRole.ADMIN);
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .patch('/users/invalid')
        .send({ role: UserRole.ADMIN })
        .expect(400);
    });
  });

  describe('DELETE /users/:id', () => {
    it('returns 204 with no body', async () => {
      service.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/users/00000000-0000-4000-8000-000000000001`)
        .expect(204)
        .expect((res) => {
          expect(res.text).toBe('');
        });
    });
  });
});
