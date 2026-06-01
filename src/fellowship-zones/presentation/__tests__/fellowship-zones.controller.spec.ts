import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as request from 'supertest';
import { FellowshipZonesController } from '../fellowship-zones.controller';
import { FellowshipZonesService } from '../../application/fellowship-zones.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { UserRole } from '../../../users/domain/user';
import { makeZone } from '../../../test/fixtures';

const mockFellowshipZonesService = () => ({
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

describe('FellowshipZonesController', () => {
  let app: INestApplication;
  let service: ReturnType<typeof mockFellowshipZonesService>;

  beforeEach(async () => {
    service = mockFellowshipZonesService();

    const module = await Test.createTestingModule({
      controllers: [FellowshipZonesController],
      providers: [{ provide: FellowshipZonesService, useValue: service }],
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

  describe('GET /fellowship-zones', () => {
    it('returns 200 with array of zones', async () => {
      service.findAll.mockResolvedValue([makeZone()]);

      await request(app.getHttpServer())
        .get('/fellowship-zones')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(1);
          expect(res.body[0].name).toBe('North Zone');
        });
    });
  });

  describe('GET /fellowship-zones/:id', () => {
    it('returns 200 with the zone', async () => {
      const zone = makeZone();
      service.findById.mockResolvedValue(zone);

      await request(app.getHttpServer())
        .get(`/fellowship-zones/${zone.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(zone.id);
          expect(res.body.name).toBe(zone.name);
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .get('/fellowship-zones/not-a-uuid')
        .expect(400);
    });

    it('returns 404 when zone not found', async () => {
      service.findById.mockRejectedValue(
        new HttpException('Zone not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .get('/fellowship-zones/00000000-0000-4000-8000-000000000099')
        .expect(404);
    });
  });

  describe('POST /fellowship-zones', () => {
    const validPayload = { name: 'East Zone' };

    it('returns 201 with created zone', async () => {
      const zone = makeZone({ name: 'East Zone' });
      service.create.mockResolvedValue(zone);

      await request(app.getHttpServer())
        .post('/fellowship-zones')
        .send(validPayload)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe('East Zone');
        });
    });

    it('returns 400 when name is too short', async () => {
      await request(app.getHttpServer())
        .post('/fellowship-zones')
        .send({ name: 'X' })
        .expect(400);
    });

    it('returns 400 when name is missing', async () => {
      await request(app.getHttpServer())
        .post('/fellowship-zones')
        .send({})
        .expect(400);
    });

    it('returns 409 when zone name already exists', async () => {
      service.create.mockRejectedValue(
        new HttpException('Zone already exists', HttpStatus.CONFLICT),
      );

      await request(app.getHttpServer())
        .post('/fellowship-zones')
        .send(validPayload)
        .expect(409);
    });
  });

  describe('PATCH /fellowship-zones/:id', () => {
    it('returns 200 with updated zone', async () => {
      const zone = makeZone({ name: 'Updated Zone' });
      service.update.mockResolvedValue(zone);

      await request(app.getHttpServer())
        .patch(`/fellowship-zones/${zone.id}`)
        .send({ name: 'Updated Zone' })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Zone');
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .patch('/fellowship-zones/invalid')
        .send({ name: 'X' })
        .expect(400);
    });

    it('returns 404 when zone not found', async () => {
      service.update.mockRejectedValue(
        new HttpException('Zone not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .patch('/fellowship-zones/00000000-0000-4000-8000-000000000099')
        .send({ name: 'East Zone' })
        .expect(404);
    });
  });

  describe('DELETE /fellowship-zones/:id', () => {
    it('returns 204 with no body', async () => {
      service.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete('/fellowship-zones/00000000-0000-4000-8000-000000000001')
        .expect(204)
        .expect((res) => {
          expect(res.text).toBe('');
        });
    });

    it('returns 404 when zone not found', async () => {
      service.delete.mockRejectedValue(
        new HttpException('Zone not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .delete('/fellowship-zones/00000000-0000-4000-8000-000000000099')
        .expect(404);
    });
  });
});
