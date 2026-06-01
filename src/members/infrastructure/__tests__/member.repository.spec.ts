import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MemberRepository } from '../member.repository';
import { MemberEntity } from '../member.entity';
import { makeMember, ID1, ID2 } from '../../../test/fixtures';

const makeMemberEntity = (): MemberEntity => {
  const e = new MemberEntity();
  Object.assign(e, makeMember());
  e.departments = [];
  return e;
};

const makeQb = (entities: MemberEntity[], total: number = entities.length) => {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => jest.fn().mockReturnValue(qb);

  qb.orderBy = chain();
  qb.andWhere = chain();
  qb.innerJoin = chain();
  qb.skip = chain();
  qb.take = chain();
  qb.getManyAndCount = jest.fn().mockResolvedValue([entities, total]);

  return qb;
};

const makeRelationQb = () => {
  const qb: Record<string, jest.Mock> = {};
  qb.relation = jest.fn().mockReturnValue(qb);
  qb.of = jest.fn().mockReturnValue(qb);
  qb.add = jest.fn().mockResolvedValue(undefined);
  qb.remove = jest.fn().mockResolvedValue(undefined);
  return qb;
};

describe('MemberRepository', () => {
  let repository: MemberRepository;
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
        MemberRepository,
        { provide: getRepositoryToken(MemberEntity), useValue: orm },
      ],
    }).compile();

    repository = module.get(MemberRepository);
  });

  describe('findAll', () => {
    it('returns paginated members on success', async () => {
      const entities = [makeMemberEntity()];
      orm.createQueryBuilder.mockReturnValue(makeQb(entities, 1));

      const result = await repository.findAll();

      expect(result.isRight()).toBe(true);
      const value = result.fold(
        () => null,
        (r) => r,
      );
      expect(value?.data).toHaveLength(1);
      expect(value?.total).toBe(1);
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
    it('returns member when found', async () => {
      const entity = makeMemberEntity();
      orm.findOne.mockResolvedValue(entity);

      const result = await repository.findById(entity.id);

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (m) => m.id,
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

  describe('create', () => {
    it('returns new member on success', async () => {
      const entity = makeMemberEntity();
      orm.create.mockReturnValue(entity);
      orm.save.mockResolvedValue(entity);

      const result = await repository.create({
        firstName: 'John',
        lastName: 'Doe',
      });

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (m) => m.firstName,
        ),
      ).toBe('John');
    });

    it('returns NetworkError when save throws', async () => {
      orm.create.mockReturnValue(makeMemberEntity());
      orm.save.mockRejectedValue(new Error('unique constraint'));

      const result = await repository.create({
        firstName: 'John',
        lastName: 'Doe',
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

  describe('update', () => {
    it('calls orm.update and re-fetches the member', async () => {
      const entity = makeMemberEntity();
      orm.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });
      orm.findOne.mockResolvedValue(entity);

      const result = await repository.update(entity.id, { firstName: 'Jane' });

      expect(orm.update).toHaveBeenCalledWith(entity.id, { firstName: 'Jane' });
      expect(result.isRight()).toBe(true);
    });

    it('returns NetworkError when orm.update throws', async () => {
      orm.update.mockRejectedValue(new Error('DB error'));

      const result = await repository.update('some-id', {});

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

      const result = await repository.delete(ID1);

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

  describe('findDepartments', () => {
    it('returns assigned departments for a member', async () => {
      const entity = makeMemberEntity();
      entity.departments = [{ id: ID2, name: 'Worship' } as any];
      orm.findOne.mockResolvedValue(entity);

      const result = await repository.findDepartments(ID1);

      expect(result.isRight()).toBe(true);
      expect(
        result.fold(
          () => null,
          (d) => d,
        ),
      ).toHaveLength(1);
      expect(orm.findOne).toHaveBeenCalledWith({
        where: { id: ID1 },
        relations: ['departments'],
      });
    });

    it('returns NotFoundError when member does not exist', async () => {
      orm.findOne.mockResolvedValue(null);

      const result = await repository.findDepartments(ID1);

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NotFoundError');
    });

    it('returns NetworkError when ORM throws', async () => {
      orm.findOne.mockRejectedValue(new Error('DB error'));

      const result = await repository.findDepartments(ID1);

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NetworkError');
    });
  });

  describe('assignDepartment', () => {
    it('uses TypeORM relation API to add department', async () => {
      const qb = makeRelationQb();
      orm.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.assignDepartment(ID1, ID2);

      expect(result.isRight()).toBe(true);
      expect(qb.relation).toHaveBeenCalledWith(MemberEntity, 'departments');
      expect(qb.of).toHaveBeenCalledWith(ID1);
      expect(qb.add).toHaveBeenCalledWith(ID2);
    });

    it('returns ConflictError when the assignment already exists', async () => {
      const qb = makeRelationQb();
      qb.add.mockRejectedValue(new Error('unique constraint'));
      orm.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.assignDepartment(ID1, ID2);

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('ConflictError');
    });
  });

  describe('removeDepartment', () => {
    it('uses TypeORM relation API to remove department', async () => {
      const qb = makeRelationQb();
      orm.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.removeDepartment(ID1, ID2);

      expect(result.isRight()).toBe(true);
      expect(qb.relation).toHaveBeenCalledWith(MemberEntity, 'departments');
      expect(qb.of).toHaveBeenCalledWith(ID1);
      expect(qb.remove).toHaveBeenCalledWith(ID2);
    });

    it('returns NetworkError when ORM throws', async () => {
      const qb = makeRelationQb();
      qb.remove.mockRejectedValue(new Error('DB error'));
      orm.createQueryBuilder.mockReturnValue(qb);

      const result = await repository.removeDepartment(ID1, ID2);

      expect(result.isLeft()).toBe(true);
      expect(
        result.fold(
          (e) => e.kind,
          () => null,
        ),
      ).toBe('NetworkError');
    });
  });
});
