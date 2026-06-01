import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FellowshipZoneRepository } from '../fellowship-zone.repository';
import { FellowshipZoneEntity } from '../fellowship-zone.entity';
import { makeZone } from '../../../test/fixtures';

const makeEntity = (): FellowshipZoneEntity => {
  const e = new FellowshipZoneEntity();
  Object.assign(e, makeZone());
  return e;
};

describe('FellowshipZoneRepository', () => {
  let repository: FellowshipZoneRepository;
  let orm: jest.Mocked<Repository<FellowshipZoneEntity>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FellowshipZoneRepository,
        {
          provide: getRepositoryToken(FellowshipZoneEntity),
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

    repository = module.get(FellowshipZoneRepository);
    orm = module.get(getRepositoryToken(FellowshipZoneEntity));
  });

  describe('findAll', () => {
    it('returns zones on success', async () => {
      orm.find.mockResolvedValue([makeEntity()]);

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
    it('returns zone when found', async () => {
      const entity = makeEntity();
      orm.findOne.mockResolvedValue(entity);

      const result = await repository.findById(entity.id);

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (z) => z.id,
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

  describe('findByName', () => {
    it('returns zone when found', async () => {
      const entity = makeEntity();
      orm.findOne.mockResolvedValue(entity);

      const result = await repository.findByName('North Zone');

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (z) => z?.name,
        ),
      ).toBe('North Zone');
    });

    it('returns null when name not registered', async () => {
      orm.findOne.mockResolvedValue(null);

      const result = await repository.findByName('Unknown Zone');

      expect(result.isRight()).toBe(true);
      expect(result.getOrElse(undefined as never)).toBeNull();
    });
  });

  describe('create', () => {
    it('returns new zone on success', async () => {
      const entity = makeEntity();
      orm.create.mockReturnValue(entity);
      orm.save.mockResolvedValue(entity);

      const result = await repository.create({ name: entity.name });

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (z) => z.name,
        ),
      ).toBe(entity.name);
    });

    it('returns NetworkError when save throws', async () => {
      orm.create.mockReturnValue(makeEntity());
      orm.save.mockRejectedValue(new Error('unique constraint'));

      const result = await repository.create({ name: 'North Zone' });

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NetworkError');
    });
  });

  describe('update', () => {
    it('calls orm.update and re-fetches the zone', async () => {
      const entity = makeEntity();
      orm.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      orm.findOne.mockResolvedValue(entity);

      const result = await repository.update(entity.id, {
        name: 'Updated Zone',
      });

      expect(orm.update).toHaveBeenCalledWith(entity.id, {
        name: 'Updated Zone',
      });
      expect(result.isRight()).toBe(true);
    });

    it('returns NetworkError when orm.update throws', async () => {
      orm.update.mockRejectedValue(new Error('DB error'));

      const result = await repository.update('some-id', { name: 'X' });

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

      const result = await repository.delete(
        '00000000-0000-4000-8000-000000000001',
      );

      expect(result.isRight()).toBe(true);
    });

    it('returns NotFoundError when no rows affected', async () => {
      orm.delete.mockResolvedValue({ affected: 0, raw: [] });

      const result = await repository.delete(
        '00000000-0000-4000-8000-000000000001',
      );

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
