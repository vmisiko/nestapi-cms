import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users.service';
import { UserRepository } from '../../infrastructure/user.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import { UserRole } from '../../domain/user';
import { makeUser } from '../../../test/user.fixture';

const mockUserRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('UsersService', () => {
  let service: UsersService;
  let repo: ReturnType<typeof mockUserRepository>;

  beforeEach(async () => {
    repo = mockUserRepository();
    const module = await Test.createTestingModule({
      providers: [UsersService, { provide: UserRepository, useValue: repo }],
    }).compile();

    service = module.get(UsersService);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed_pw' as never);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('findAll', () => {
    it('returns array of users', async () => {
      const users = [makeUser()];
      repo.findAll.mockResolvedValue(Either.right(users));

      const result = await service.findAll();

      expect(result).toHaveLength(1);
    });

    it('throws 500 on network error', async () => {
      repo.findAll.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );

      await expect(service.findAll()).rejects.toThrow(
        new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('findById', () => {
    it('returns the user when found', async () => {
      const user = makeUser();
      repo.findById.mockResolvedValue(Either.right(user));

      const result = await service.findById(user.id);

      expect(result.id).toBe(user.id);
    });

    it('throws 404 when user not found', async () => {
      repo.findById.mockResolvedValue(
        Either.left(DataError.notFound('User not found')),
      );

      await expect(service.findById('bad-id')).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('create', () => {
    const dto = {
      email: 'new@x.com',
      password: 'password1',
      role: UserRole.STAFF,
    };

    it('returns created user', async () => {
      const user = makeUser({ email: dto.email });
      repo.findByEmail.mockResolvedValue(Either.right(null));
      repo.create.mockResolvedValue(Either.right(user));

      const result = await service.create(dto);

      expect(result.email).toBe(dto.email);
      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 12);
    });

    it('throws 409 when email already exists', async () => {
      repo.findByEmail.mockResolvedValue(Either.right(makeUser()));

      const err = await service.create(dto).catch((e: HttpException) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.CONFLICT);
      expect((err as HttpException).message).toContain('already registered');
    });
  });

  describe('update', () => {
    it('returns updated user', async () => {
      const user = makeUser({ role: UserRole.ADMIN });
      repo.update.mockResolvedValue(Either.right(user));

      const result = await service.update('uuid-test-1', {
        role: UserRole.ADMIN,
      });

      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('hashes password when provided in dto', async () => {
      const user = makeUser();
      repo.update.mockResolvedValue(Either.right(user));

      await service.update('uuid-test-1', { password: 'newpassword' });

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword', 12);
    });

    it('throws 404 when user not found', async () => {
      repo.update.mockResolvedValue(
        Either.left(DataError.notFound('User not found')),
      );

      await expect(service.update('bad-id', {})).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('delete', () => {
    it('returns undefined on success', async () => {
      repo.delete.mockResolvedValue(Either.right(undefined));

      const result = await service.delete('uuid-test-1');

      expect(result).toBeUndefined();
    });

    it('throws 404 when user not found', async () => {
      repo.delete.mockResolvedValue(
        Either.left(DataError.notFound('User not found')),
      );

      await expect(service.delete('bad-id')).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('updateRefreshToken', () => {
    it('stores the hash', async () => {
      const user = makeUser({ refreshTokenHash: 'hash' });
      repo.update.mockResolvedValue(Either.right(user));

      await service.updateRefreshToken('uuid-test-1', 'hash');

      expect(repo.update).toHaveBeenCalledWith('uuid-test-1', {
        refreshTokenHash: 'hash',
      });
    });

    it('clears the hash when passed null', async () => {
      const user = makeUser({ refreshTokenHash: null });
      repo.update.mockResolvedValue(Either.right(user));

      await service.updateRefreshToken('uuid-test-1', null);

      expect(repo.update).toHaveBeenCalledWith('uuid-test-1', {
        refreshTokenHash: null,
      });
    });
  });
});
