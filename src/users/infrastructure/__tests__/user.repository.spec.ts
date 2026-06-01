import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository } from '../user.repository';
import { UserEntity } from '../user.entity';
import { UserRole } from '../../domain/user';
import { makeUser } from '../../../test/user.fixture';

const makeEntity = (): UserEntity => {
  const e = new UserEntity();
  Object.assign(e, makeUser());
  return e;
};

describe('UserRepository', () => {
  let repository: UserRepository;
  let orm: jest.Mocked<Repository<UserEntity>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserRepository,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
          },
        },
      ],
    }).compile();

    repository = module.get(UserRepository);
    orm = module.get(getRepositoryToken(UserEntity));
  });

  describe('findAll', () => {
    it('returns users on success', async () => {
      const entities = [makeEntity()];
      orm.find.mockResolvedValue(entities);

      const result = await repository.findAll();

      expect(result.isRight()).toBe(true);
      expect(result.getOrElse([])).toHaveLength(1);
    });

    it('returns NetworkError when ORM throws', async () => {
      orm.find.mockRejectedValue(new Error('connection lost'));

      const result = await repository.findAll();

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NetworkError');
    });
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const entity = makeEntity();
      orm.findOne.mockResolvedValue(entity);

      const result = await repository.findById(entity.id);

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (u) => u.id,
        ),
      ).toBe(entity.id);
    });

    it('returns NotFoundError when entity does not exist', async () => {
      orm.findOne.mockResolvedValue(null);

      const result = await repository.findById('bad-id');

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NotFoundError');
    });

    it('returns NetworkError when ORM throws', async () => {
      orm.findOne.mockRejectedValue(new Error('timeout'));

      const result = await repository.findById('any-id');

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NetworkError');
    });
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const entity = makeEntity();
      orm.findOne.mockResolvedValue(entity);

      const result = await repository.findByEmail(entity.email);

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (u) => u?.email,
        ),
      ).toBe(entity.email);
    });

    it('returns null when email not registered', async () => {
      orm.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail('unknown@x.com');

      expect(result.isRight()).toBe(true);
      expect(result.getOrElse(undefined as never)).toBeNull();
    });
  });

  describe('create', () => {
    it('returns new user on success', async () => {
      const entity = makeEntity();
      orm.create.mockReturnValue(entity);
      orm.save.mockResolvedValue(entity);

      const result = await repository.create({
        email: entity.email,
        passwordHash: entity.passwordHash,
        role: UserRole.STAFF,
      });

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (u) => u.email,
        ),
      ).toBe(entity.email);
    });

    it('returns NetworkError when save throws', async () => {
      orm.create.mockReturnValue(makeEntity());
      orm.save.mockRejectedValue(new Error('unique constraint'));

      const result = await repository.create({
        email: 'a@a.com',
        passwordHash: 'hash',
      });

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NetworkError');
    });
  });

  describe('delete', () => {
    it('returns void on success', async () => {
      orm.delete.mockResolvedValue({ affected: 1, raw: [] });

      const result = await repository.delete('uuid-test-1');

      expect(result.isRight()).toBe(true);
    });

    it('returns NotFoundError when no rows affected', async () => {
      orm.delete.mockResolvedValue({ affected: 0, raw: [] });

      const result = await repository.delete('uuid-test-1');

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NotFoundError');
    });
  });
});
