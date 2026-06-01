import { Test } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ExecutionContext,
} from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from '../auth.controller';
import { AuthService } from '../../application/auth.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { JwtRefreshGuard } from '../../../common/guards/jwt-refresh.guard';
import { makeUser } from '../../../test/user.fixture';

const mockAuthService = () => ({
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
});

describe('AuthController', () => {
  let app: INestApplication;
  let service: ReturnType<typeof mockAuthService>;

  beforeEach(async () => {
    service = mockAuthService();

    const module = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<{ user: unknown }>();
          req.user = { id: 'uuid-test-1' };
          return true;
        },
      })
      .overrideGuard(JwtRefreshGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          const req = ctx.switchToHttp().getRequest<{ user: unknown }>();
          req.user = {
            sub: 'uuid-test-1',
            refreshToken: 'valid_refresh_token',
          };
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterEach(() => app.close());

  describe('POST /auth/login', () => {
    const validCreds = { email: 'test@citymega.org', password: 'password1' };

    it('returns 200 with access token and sets cookie', async () => {
      const user = makeUser();
      service.login.mockResolvedValue({
        user,
        accessToken: 'access.jwt',
        refreshToken: 'refresh.jwt',
      });

      await request(app.getHttpServer())
        .post('/auth/login')
        .send(validCreds)
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBe('access.jwt');
          expect(res.body.tokenType).toBe('Bearer');
          expect(res.headers['set-cookie']).toBeDefined();
          expect(res.headers['set-cookie'][0]).toContain('refresh_token');
          expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
        });
    });

    it('returns 400 when email is invalid', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'not-an-email', password: 'password1' })
        .expect(400);
    });

    it('returns 400 when password is too short', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: validCreds.email, password: 'short' })
        .expect(400);
    });

    it('returns 400 when body fields are missing', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400);
    });
  });

  describe('POST /auth/refresh', () => {
    it('returns 200 with new access token and rotates cookie', async () => {
      service.refresh.mockResolvedValue({
        accessToken: 'new.access.jwt',
        refreshToken: 'new.refresh.jwt',
      });

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBe('new.access.jwt');
          expect(service.refresh).toHaveBeenCalledWith(
            'uuid-test-1',
            'valid_refresh_token',
          );
        });
    });
  });

  describe('POST /auth/logout', () => {
    it('returns 204 and clears cookie', async () => {
      service.logout.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(204)
        .expect((res) => {
          expect(res.text).toBe('');
          expect(service.logout).toHaveBeenCalledWith('uuid-test-1');
        });
    });
  });
});
