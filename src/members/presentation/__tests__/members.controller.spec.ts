import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import * as request from 'supertest';
import { MembersController } from './members.controller';
import { MembersService } from '../application/members.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../../users/domain/user';
import {
  makeMember,
  makeAssignedDepartment,
  ID1,
  ID2,
} from '../../test/fixtures';

const mockMembersService = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findDepartments: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  assignDepartment: jest.fn(),
  removeDepartment: jest.fn(),
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

describe('MembersController', () => {
  let app: INestApplication;
  let service: ReturnType<typeof mockMembersService>;

  beforeEach(async () => {
    service = mockMembersService();

    const module = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [{ provide: MembersService, useValue: service }],
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

  describe('GET /members', () => {
    it('returns 200 with paginated members', async () => {
      service.findAll.mockResolvedValue({ data: [makeMember()], total: 1 });

      await request(app.getHttpServer())
        .get('/members')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data).toHaveLength(1);
          expect(res.body.total).toBe(1);
          // MemberResponseDto adds computed fields
          expect(res.body.data[0].name).toBe('John Doe');
          expect(res.body.data[0].initials).toBe('JD');
        });
    });

    it('returns 400 for invalid status filter', async () => {
      await request(app.getHttpServer())
        .get('/members?status=invalid')
        .expect(400);
    });
  });

  describe('GET /members/:id', () => {
    it('returns 200 with the member', async () => {
      const member = makeMember();
      service.findById.mockResolvedValue(member);

      await request(app.getHttpServer())
        .get(`/members/${member.id}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(member.id);
          expect(res.body.firstName).toBe('John');
          expect(res.body.lastName).toBe('Doe');
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer()).get('/members/not-a-uuid').expect(400);
    });

    it('returns 404 when member not found', async () => {
      service.findById.mockRejectedValue(
        new HttpException('Member not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .get('/members/00000000-0000-4000-8000-000000000099')
        .expect(404);
    });
  });

  describe('GET /members/:id/departments', () => {
    it('returns 200 with department assignments', async () => {
      const depts = [makeAssignedDepartment()];
      service.findDepartments.mockResolvedValue(depts);

      await request(app.getHttpServer())
        .get(`/members/${ID1}/departments`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toHaveLength(1);
          expect(res.body[0].id).toBe(ID2);
          expect(res.body[0].name).toBe('Worship Department');
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .get('/members/not-a-uuid/departments')
        .expect(400);
    });
  });

  describe('POST /members', () => {
    const validPayload = {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@citymega.org',
    };

    it('returns 201 with created member', async () => {
      const member = makeMember({ firstName: 'Alice', lastName: 'Smith' });
      service.create.mockResolvedValue(member);

      await request(app.getHttpServer())
        .post('/members')
        .send(validPayload)
        .expect(201)
        .expect((res) => {
          expect(res.body.firstName).toBe('Alice');
        });
    });

    it('returns 400 when firstName is missing', async () => {
      await request(app.getHttpServer())
        .post('/members')
        .send({ lastName: 'Smith' })
        .expect(400);
    });

    it('returns 400 when lastName is missing', async () => {
      await request(app.getHttpServer())
        .post('/members')
        .send({ firstName: 'Alice' })
        .expect(400);
    });

    it('returns 400 when email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/members')
        .send({ ...validPayload, email: 'not-an-email' })
        .expect(400);
    });

    it('returns 400 when fellowshipId is not a UUID', async () => {
      await request(app.getHttpServer())
        .post('/members')
        .send({ ...validPayload, fellowshipId: 'not-a-uuid' })
        .expect(400);
    });

    it('returns 400 when status is invalid', async () => {
      await request(app.getHttpServer())
        .post('/members')
        .send({ ...validPayload, status: 'invalid_status' })
        .expect(400);
    });
  });

  describe('PATCH /members/:id', () => {
    it('returns 200 with updated member', async () => {
      const member = makeMember({ firstName: 'Jane' });
      service.update.mockResolvedValue(member);

      await request(app.getHttpServer())
        .patch(`/members/${member.id}`)
        .send({ firstName: 'Jane' })
        .expect(200)
        .expect((res) => {
          expect(res.body.firstName).toBe('Jane');
        });
    });

    it('returns 400 for non-UUID id', async () => {
      await request(app.getHttpServer())
        .patch('/members/invalid')
        .send({ firstName: 'Jane' })
        .expect(400);
    });

    it('returns 404 when member not found', async () => {
      service.update.mockRejectedValue(
        new HttpException('Member not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .patch('/members/00000000-0000-4000-8000-000000000099')
        .send({ firstName: 'Jane' })
        .expect(404);
    });
  });

  describe('DELETE /members/:id', () => {
    it('returns 204 with no body', async () => {
      service.delete.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/members/${ID1}`)
        .expect(204)
        .expect((res) => {
          expect(res.text).toBe('');
        });
    });

    it('returns 404 when member not found', async () => {
      service.delete.mockRejectedValue(
        new HttpException('Member not found', HttpStatus.NOT_FOUND),
      );

      await request(app.getHttpServer())
        .delete('/members/00000000-0000-4000-8000-000000000099')
        .expect(404);
    });
  });

  describe('POST /members/:id/departments/:departmentId', () => {
    it('returns 201 on successful assignment', async () => {
      service.assignDepartment.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post(`/members/${ID1}/departments/${ID2}`)
        .expect(201)
        .expect((res) => {
          expect(res.body).toEqual({});
        });
    });

    it('returns 400 for non-UUID member id', async () => {
      await request(app.getHttpServer())
        .post(`/members/not-a-uuid/departments/${ID2}`)
        .expect(400);
    });

    it('returns 400 for non-UUID department id', async () => {
      await request(app.getHttpServer())
        .post(`/members/${ID1}/departments/not-a-uuid`)
        .expect(400);
    });

    it('returns 409 when already assigned', async () => {
      service.assignDepartment.mockRejectedValue(
        new HttpException(
          'Member is already in this department',
          HttpStatus.CONFLICT,
        ),
      );

      await request(app.getHttpServer())
        .post(`/members/${ID1}/departments/${ID2}`)
        .expect(409);
    });
  });

  describe('DELETE /members/:id/departments/:departmentId', () => {
    it('returns 204 on successful removal', async () => {
      service.removeDepartment.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .delete(`/members/${ID1}/departments/${ID2}`)
        .expect(204)
        .expect((res) => {
          expect(res.text).toBe('');
        });
    });

    it('returns 404 when assignment does not exist', async () => {
      service.removeDepartment.mockRejectedValue(
        new HttpException(
          'Member is not in this department',
          HttpStatus.NOT_FOUND,
        ),
      );

      await request(app.getHttpServer())
        .delete(`/members/${ID1}/departments/${ID2}`)
        .expect(404);
    });

    it('returns 400 for non-UUID member id', async () => {
      await request(app.getHttpServer())
        .delete(`/members/not-a-uuid/departments/${ID2}`)
        .expect(400);
    });
  });
});
