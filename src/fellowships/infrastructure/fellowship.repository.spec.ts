import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FellowshipRepository } from './fellowship.repository';
import { FellowshipEntity } from './fellowship.entity';
import { makeFellowship } from '../../test/fixtures';
import { ActivityStatus } from '../../core/domain/enums';

const makeEntity = (): FellowshipEntity => {
  const e = new FellowshipEntity();
  Object.assign(e, makeFellowship());
  return e;
};

// Mock query builder that simulates getRawAndEntities
const makeQb = (
  entities: FellowshipEntity[],
  rawRows: Record<string, unknown>[] = [],
) => {
  const qb: Record<string, jest.Mock> = {};
  const chain = (returnVal?: unknown) => {
    const mock = jest.fn().mockReturnValue(qb);
    if (returnVal !== undefined) {
      mock.mockResolvedValue(returnVal);
    }
    return mock;
  };

  qb.leftJoin = chain();
  qb.addSelect = chain();
  qb.groupBy = chain();
  qb.orderBy = chain();
  qb.andWhere = chain();
  qb.where = chain();
  qb.skip = chain();
  qb.take = chain();
  qb.getRawAndEntities = jest.fn().mockResolvedValue({
    entities,
    raw: rawRows.length ? rawRows : entities.map(() => ({ memberCount: 0 })),
  });
  qb.getManyAndCount = jest.fn().mockResolvedValue([entities, entities.length]);

  return qb;
};

describe('FellowshipRepository', () => {
  let repository: FellowshipRepository;
  let orm: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    orm = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        FellowshipRepository,
        {
          provide: getRepositoryToken(FellowshipEntity),
          useValue: orm,
        },
      ],
    }).compile();

    repository = module.get(FellowshipRepository);
  });

  describe('findAll', () => {
    it('returns fellowships on success', async () => {
      const entities = [makeEntity()];
      orm.createQueryBuilder.mockReturnValue(makeQb(entities));

      const result = await repository.findAll();

      expect(result.isRight()).toBe(true);
      expect(result.getOrElse([])).toHaveLength(1);
    });

    it('applies zoneId filter when provided', async () => {
      const qb = makeQb([]);
      orm.createQueryBuilder.mockReturnValue(qb);

      await repository.findAll({
        zoneId: '00000000-0000-4000-8000-000000000002',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'f.zone_id = :zoneId',
        expect.objectContaining({
          zoneId: '00000000-0000-4000-8000-000000000002',
        }),
      );
    });

    it('applies status filter when provided', async () => {
      const qb = makeQb([]);
      orm.createQueryBuilder.mockReturnValue(qb);

      await repository.findAll({ status: ActivityStatus.INACTIVE });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'f.status = :status',
        expect.objectContaining({ status: ActivityStatus.INACTIVE }),
      );
    });

    it('returns NetworkError when ORM throws', async () => {
      orm.createQueryBuilder.mockImplementation(() => {
        throw new Error('connection lost');
      });

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
    it('returns fellowship when found', async () => {
      const entity = makeEntity();
      orm.createQueryBuilder.mockReturnValue(makeQb([entity]));

      const result = await repository.findById(entity.id);

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (f) => f.id,
        ),
      ).toBe(entity.id);
    });

    it('returns NotFoundError when not found', async () => {
      orm.createQueryBuilder.mockReturnValue(makeQb([]));

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
      orm.createQueryBuilder.mockImplementation(() => {
        throw new Error('timeout');
      });

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

  describe('findBySlug', () => {
    it('returns fellowship when found by slug', async () => {
      const entity = makeEntity();
      orm.createQueryBuilder.mockReturnValue(makeQb([entity]));

      const result = await repository.findBySlug('alpha-fellowship');

      expect(result.isRight()).toBe(true);
    });

    it('returns NotFoundError when slug not found', async () => {
      orm.createQueryBuilder.mockReturnValue(makeQb([]));

      const result = await repository.findBySlug('unknown-slug');

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NotFoundError');
    });
  });

  describe('findByName', () => {
    it('returns fellowship when found', async () => {
      const entity = makeEntity();
      orm.findOne.mockResolvedValue(entity);

      const result = await repository.findByName('Alpha Fellowship');

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (f) => f?.name,
        ),
      ).toBe('Alpha Fellowship');
    });

    it('returns null when name not found', async () => {
      orm.findOne.mockResolvedValue(null);

      const result = await repository.findByName('Unknown');

      expect(result.isRight()).toBe(true);
      expect(result.getOrElse(undefined as never)).toBeNull();
    });
  });

  describe('create', () => {
    it('returns new fellowship on success', async () => {
      const entity = makeEntity();
      orm.create.mockReturnValue(entity);
      orm.save.mockResolvedValue(entity);

      const result = await repository.create({
        name: entity.name,
        slug: entity.slug,
        zoneId: entity.zoneId,
        meetingDay: entity.meetingDay,
        meetingTime: entity.meetingTime,
        location: entity.location,
      });

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (f) => f.name,
        ),
      ).toBe(entity.name);
    });

    it('returns NetworkError when save throws', async () => {
      orm.create.mockReturnValue(makeEntity());
      orm.save.mockRejectedValue(new Error('unique constraint'));

      const result = await repository.create({
        name: 'X',
        slug: 'x',
        zoneId: '00000000-0000-4000-8000-000000000002',
        meetingDay: 'Monday',
        meetingTime: '09:00',
        location: 'Room 1',
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

      const result = await repository.delete(
        '00000000-0000-4000-8000-000000000001',
      );

      expect(result.isRight()).toBe(true);
    });

    it('returns NotFoundError when no rows affected', async () => {
      orm.delete.mockResolvedValue({ affected: 0, raw: [] });

      const result = await repository.delete(
        '00000000-0000-4000-8000-000000000099',
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
