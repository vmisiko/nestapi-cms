import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth.service';
import { UsersService } from '../../../users/application/users.service';
import { UserRepository } from '../../../users/infrastructure/user.repository';
import { Either } from '../../../core/domain/either';
import { makeUser } from '../../../test/user.fixture';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let userRepository: { findByEmail: jest.Mock };
  let jwtService: jest.Mocked<Partial<JwtService>>;
  let configService: jest.Mocked<Partial<ConfigService>>;

  beforeEach(async () => {
    usersService = {
      findById: jest.fn(),
      updateRefreshToken: jest.fn(),
      setLastLogin: jest.fn(),
    };
    userRepository = { findByEmail: jest.fn() };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
    };
    configService = {
      getOrThrow: jest.fn().mockReturnValue('test-secret'),
      get: jest.fn().mockReturnValue('15m'),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: UserRepository, useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('login', () => {
    it('returns access and refresh tokens on valid credentials', async () => {
      const user = makeUser();
      userRepository.findByEmail.mockResolvedValue(Either.right(user));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_rt' as never);
      (usersService.updateRefreshToken as jest.Mock).mockResolvedValue(user);
      (usersService.setLastLogin as jest.Mock).mockResolvedValue(undefined);

      const result = await service.login({ email: user.email, password: 'pw' });

      expect(result.accessToken).toBe('mock.jwt.token');
      expect(result.refreshToken).toBe('mock.jwt.token');
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('throws 401 when credentials are invalid', async () => {
      userRepository.findByEmail.mockResolvedValue(Either.right(null));

      await expect(
        service.login({ email: 'x@x.com', password: 'wrong' }),
      ).rejects.toThrow(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );
    });

    it('throws 401 when user is inactive', async () => {
      const user = makeUser({ isActive: false });
      userRepository.findByEmail.mockResolvedValue(Either.right(user));

      await expect(
        service.login({ email: user.email, password: 'pw' }),
      ).rejects.toThrow(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );
    });

    it('throws 401 when password does not match', async () => {
      const user = makeUser();
      userRepository.findByEmail.mockResolvedValue(Either.right(user));
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(
        service.login({ email: user.email, password: 'bad' }),
      ).rejects.toThrow(
        new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED),
      );
    });
  });

  describe('refresh', () => {
    it('returns new tokens when refresh token is valid', async () => {
      const user = makeUser({ refreshTokenHash: 'stored_hash' });
      (usersService.findById as jest.Mock).mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('new_hash' as never);
      (usersService.updateRefreshToken as jest.Mock).mockResolvedValue(user);

      const result = await service.refresh(user.id, 'valid_refresh_token');

      expect(result.accessToken).toBe('mock.jwt.token');
    });

    it('throws 403 when user has no stored refresh token', async () => {
      const user = makeUser({ refreshTokenHash: null });
      (usersService.findById as jest.Mock).mockResolvedValue(user);

      await expect(service.refresh(user.id, 'any_token')).rejects.toThrow(
        new HttpException('Access denied', HttpStatus.FORBIDDEN),
      );
    });

    it('throws 403 when refresh token does not match stored hash', async () => {
      const user = makeUser({ refreshTokenHash: 'stored_hash' });
      (usersService.findById as jest.Mock).mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.refresh(user.id, 'tampered_token')).rejects.toThrow(
        new HttpException('Access denied', HttpStatus.FORBIDDEN),
      );
    });
  });

  describe('logout', () => {
    it('clears the refresh token hash', async () => {
      (usersService.updateRefreshToken as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.logout('uuid-test-1');

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'uuid-test-1',
        null,
      );
    });
  });

  describe('validateJwtPayload', () => {
    it('returns the user for the given sub', async () => {
      const user = makeUser();
      (usersService.findById as jest.Mock).mockResolvedValue(user);

      const result = await service.validateJwtPayload({ sub: user.id });

      expect(result.id).toBe(user.id);
    });
  });
});
