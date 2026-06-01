import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { DepartmentsService } from '../departments.service';
import { DepartmentRepository } from '../../infrastructure/department.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import { makeDepartment } from '../../../test/fixtures';

const mockDepartmentRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let repo: ReturnType<typeof mockDepartmentRepository>;

  beforeEach(async () => {
    repo = mockDepartmentRepository();
    const module = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        { provide: DepartmentRepository, useValue: repo },
      ],
    }).compile();

    service = module.get(DepartmentsService);
  });

  describe('findAll', () => {
    it('returns array of departments', async () => {
      repo.findAll.mockResolvedValue(Either.right([makeDepartment()]));

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Worship Department');
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
    it('returns the department when found', async () => {
      const dept = makeDepartment();
      repo.findById.mockResolvedValue(Either.right(dept));

      const result = await service.findById(dept.id);

      expect(result.id).toBe(dept.id);
    });

    it('throws 404 when department not found', async () => {
      repo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Department not found')),
      );

      await expect(service.findById('bad-id')).rejects.toThrow(
        new HttpException('Department not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('create', () => {
    const dto = { name: 'Media Department' };

    it('returns created department', async () => {
      const dept = makeDepartment({ name: 'Media Department' });
      repo.create.mockResolvedValue(Either.right(dept));

      const result = await service.create(dto);

      expect(result.name).toBe('Media Department');
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
    it('returns updated department', async () => {
      const dept = makeDepartment({ name: 'Updated Dept', memberTarget: 30 });
      repo.update.mockResolvedValue(Either.right(dept));

      const result = await service.update(dept.id, {
        name: 'Updated Dept',
        memberTarget: 30,
      });

      expect(result.name).toBe('Updated Dept');
      expect(result.memberTarget).toBe(30);
    });

    it('throws 404 when department not found', async () => {
      repo.update.mockResolvedValue(
        Either.left(DataError.notFound('Department not found')),
      );

      await expect(service.update('bad-id', {})).rejects.toThrow(
        new HttpException('Department not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('delete', () => {
    it('returns undefined on success', async () => {
      repo.delete.mockResolvedValue(Either.right(undefined));

      const result = await service.delete(
        '00000000-0000-4000-8000-000000000001',
      );

      expect(result).toBeUndefined();
    });

    it('throws 404 when department not found', async () => {
      repo.delete.mockResolvedValue(
        Either.left(DataError.notFound('Department not found')),
      );

      await expect(service.delete('bad-id')).rejects.toThrow(
        new HttpException('Department not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
