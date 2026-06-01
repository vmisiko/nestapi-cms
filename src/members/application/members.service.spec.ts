import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { MembersService } from './members.service';
import { MemberRepository } from '../infrastructure/member.repository';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';
import {
  makeMember,
  makeAssignedDepartment,
  ID1,
  ID2,
} from '../../test/fixtures';

const mockMemberRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findDepartments: jest.fn(),
  assignDepartment: jest.fn(),
  removeDepartment: jest.fn(),
});

describe('MembersService', () => {
  let service: MembersService;
  let repo: ReturnType<typeof mockMemberRepository>;

  beforeEach(async () => {
    repo = mockMemberRepository();
    const module = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: MemberRepository, useValue: repo },
      ],
    }).compile();

    service = module.get(MembersService);
  });

  describe('findAll', () => {
    it('returns paginated members', async () => {
      repo.findAll.mockResolvedValue(
        Either.right({ data: [makeMember()], total: 1 }),
      );

      const result = await service.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('passes filters through to repository', async () => {
      repo.findAll.mockResolvedValue(Either.right({ data: [], total: 0 }));

      await service.findAll({ page: 2, limit: 20 });

      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 20 }),
      );
    });

    it('throws 500 on network error', async () => {
      repo.findAll.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );

      await expect(service.findAll({})).rejects.toThrow(
        new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('findById', () => {
    it('returns the member when found', async () => {
      const member = makeMember();
      repo.findById.mockResolvedValue(Either.right(member));

      const result = await service.findById(member.id);

      expect(result.id).toBe(member.id);
    });

    it('throws 404 when member not found', async () => {
      repo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Member not found')),
      );

      await expect(service.findById('bad-id')).rejects.toThrow(
        new HttpException('Member not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('create', () => {
    const dto = { firstName: 'John', lastName: 'Doe' };

    it('returns created member', async () => {
      const member = makeMember();
      repo.create.mockResolvedValue(Either.right(member));

      const result = await service.create(dto);

      expect(result.firstName).toBe('John');
    });

    it('throws 500 on create network error', async () => {
      repo.create.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );

      await expect(service.create(dto)).rejects.toThrow(
        new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('update', () => {
    it('returns updated member', async () => {
      const member = makeMember({ firstName: 'Jane' });
      repo.update.mockResolvedValue(Either.right(member));

      const result = await service.update(ID1, { firstName: 'Jane' });

      expect(result.firstName).toBe('Jane');
    });

    it('throws 404 when member not found', async () => {
      repo.update.mockResolvedValue(
        Either.left(DataError.notFound('Member not found')),
      );

      await expect(service.update('bad-id', {})).rejects.toThrow(
        new HttpException('Member not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('delete', () => {
    it('returns undefined on success', async () => {
      repo.delete.mockResolvedValue(Either.right(undefined));

      const result = await service.delete(ID1);

      expect(result).toBeUndefined();
    });

    it('throws 404 when member not found', async () => {
      repo.delete.mockResolvedValue(
        Either.left(DataError.notFound('Member not found')),
      );

      await expect(service.delete('bad-id')).rejects.toThrow(
        new HttpException('Member not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('findDepartments', () => {
    it('returns assigned departments for a member', async () => {
      const depts = [makeAssignedDepartment()];
      repo.findDepartments.mockResolvedValue(Either.right(depts));

      const result = await service.findDepartments(ID1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(ID2);
    });

    it('throws 500 on network error', async () => {
      repo.findDepartments.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );

      await expect(service.findDepartments(ID1)).rejects.toThrow(
        new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('assignDepartment', () => {
    it('assigns member to department and returns void', async () => {
      repo.assignDepartment.mockResolvedValue(Either.right(undefined));

      const result = await service.assignDepartment(ID1, ID2);

      expect(result).toBeUndefined();
      expect(repo.assignDepartment).toHaveBeenCalledWith(ID1, ID2);
    });

    it('throws 409 when already assigned', async () => {
      repo.assignDepartment.mockResolvedValue(
        Either.left(DataError.conflict('Member is already in this department')),
      );

      await expect(service.assignDepartment(ID1, ID2)).rejects.toThrow(
        new HttpException(
          'Member is already in this department',
          HttpStatus.CONFLICT,
        ),
      );
    });
  });

  describe('removeDepartment', () => {
    it('returns undefined on success', async () => {
      repo.removeDepartment.mockResolvedValue(Either.right(undefined));

      const result = await service.removeDepartment(ID1, ID2);

      expect(result).toBeUndefined();
    });

    it('throws 404 when assignment does not exist', async () => {
      repo.removeDepartment.mockResolvedValue(
        Either.left(DataError.notFound('Member is not in this department')),
      );

      await expect(service.removeDepartment(ID1, ID2)).rejects.toThrow(
        new HttpException(
          'Member is not in this department',
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });
});
