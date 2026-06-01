import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as request from 'supertest';
import { FellowshipsController } from '../fellowships.controller';
import { FellowshipsService } from '../../application/fellowships.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../users/domain/user';
import { makeFellowship } from '../../../test/fixtures';

const mockFellowshipsService = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
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

describe('FellowshipsController', () => {
  let app: INestApplication;
  let service: ReturnType<typeof mockFellowshipsService>;

  beforeEach(async () => {
    service = mockFellowshipsService();

    const module = await Test.createTestingModule({
      controllers: [FellowshipsController],
      providers: [{ provide: FellowshipsService, useValue: service }],
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

  describe('GET /fellowships', () => {
    it('returns 200 with array of fellowships', async () => {
      service.findAll.mockResolvedValue([makeFellowship()]);

      await request(app.getHttpServer())
        .get('/fellowships')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(1);
          expect(res.body[0].name).toBe('Alpha Fellowship');
          expect(res.body[0].slug).toBe('alpha-fellowship');
        });
    });

    it('returns 400 for invalid status filter', async () => {
      await request(app.getHttpServer())
        .get('/fellowships?status=invalid_status')
        .expect(400);
    });
  });

  describe('GET /fellowships/slug/:slug', () => {
    it('returns 200 with fellowship by slug', async () => {
      const fellowship = makeFellowship();
      service.findBySlug.mockResolvedValue(fellowship);

      await request(app.getHttpServer())
        .get('/fellowships/slug/alpha-fellowship')
        .expect(200)
        .expect((res) => {
          expect(res.body.slug).toBe('alpha-fellowship');
        });
    });

    it('returns 404 when slug not found', async () => {
      service.findBySlug.mockRejectedValue(
        new HttpException('Fellowship not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .get('/fellowships/slug/unknown-slug')
        .expect(404);
    });
  });

  describe('GET /fellowships/:id', () => {
    it('returns 200 with the fellowship', async () => {
      const fellowship = makeFellowship();
      service.findById.mockResolvedValue(fellowship);

      await request(app.getHttpServer())
        .get(`/fellowships/${fellowship.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(fellowship.id);
          expect(res.body.memberCount).toBe(0);
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .get('/fellowships/not-a-uuid')
        .expect(400);
    });

    it('returns 404 when fellowship not found', async () => {
      service.findById.mockRejectedValue(
        new HttpException('Fellowship not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .get('/fellowships/00000000-0000-4000-8000-000000000099')
        .expect(404);
    });
  });

  describe('POST /fellowships', () => {
    const validPayload = {
      name: 'Beta Fellowship',
      zoneId: '00000000-0000-4000-8000-000000000002',
      meetingDay: 'Saturday',
      meetingTime: '09:00',
      location: 'Hall B',
    };

    it('returns 201 with created fellowship', async () => {
      const fellowship = makeFellowship({ name: 'Beta Fellowship' });
      service.create.mockResolvedValue(fellowship);

      await request(app.getHttpServer())
        .post('/fellowships')
        .send(validPayload)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('Beta Fellowship');
        });
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/fellowships')
        .send({ ...validPayload, name: undefined })
        .expect(400);
    });

    it('returns 400 when zoneId is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/fellowships')
        .send({ ...validPayload, zoneId: 'not-a-uuid' })
        .expect(400);
    });

    it('returns 400 when meetingTime format is invalid', async () => {
      await request(app.getHttpServer())
        .post('/fellowships')
        .send({ ...validPayload, meetingTime: '9am' })
        .expect(400);
    });

    it('returns 409 when fellowship name already exists', async () => {
      service.create.mockRejectedValue(
        new HttpException('Fellowship already exists', HttpStatus.CONFLICT),
      );

      await request(app.getHttpServer())
        .post('/fellowships')
        .send(validPayload)
        .expect(409);
    });
  });

  describe('PATCH /fellowships/:id', () => {
    it('returns 200 with updated fellowship', async () => {
      const fellowship = makeFellowship({ location: 'Hall C' });
      service.update.mockResolvedValue(fellowship);

      await request(app.getHttpServer())
        .patch(`/fellowships/${fellowship.id}`)
        .send({ location: 'Hall C' })
        .expect(200)
        .expect((res) => {
          expect(res.body.location).toBe('Hall C');
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .patch('/fellowships/invalid')
        .send({ location: 'Hall C' })
        .expect(400);
    });

    it('returns 404 when fellowship not found', async () => {
      service.update.mockRejectedValue(
        new HttpException('Fellowship not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .patch('/fellowships/00000000-0000-4000-8000-000000000099')
        .send({ location: 'Hall C' })
        .expect(404);
    });
  });

  describe('DELETE /fellowships/:id', () => {
    it('returns 204 with no body', async () => {
      service.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/fellowships/00000000-0000-4000-8000-000000000001')
        .expect(204)
        .expect((res) => {
          expect(res.text).toBe('');
        });
    });

    it('returns 404 when fellowship not found', async () => {
      service.delete.mockRejectedValue(
        new HttpException('Fellowship not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .delete('/fellowships/00000000-0000-4000-8000-000000000099')
        .expect(404);
    });
  });
});
