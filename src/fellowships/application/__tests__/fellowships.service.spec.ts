import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FellowshipsService } from '../fellowships.service';
import { FellowshipRepository } from '../../infrastructure/fellowship.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import { makeFellowship } from '../../../test/fixtures';
import { ActivityStatus } from '../../../core/domain/enums';

const mockFellowshipRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('FellowshipsService', () => {
  let service: FellowshipsService;
  let repo: ReturnType<typeof mockFellowshipRepository>;

  beforeEach(async () => {
    repo = mockFellowshipRepository();
    const module = await Test.createTestingModule({
      providers: [
        FellowshipsService,
        { provide: FellowshipRepository, useValue: repo },
      ],
    }).compile();

    service = module.get(FellowshipsService);
  });

  describe('findAll', () => {
    it('returns array of fellowships', async () => {
      repo.findAll.mockResolvedValue(Either.right([makeFellowship()]));

      const result = await service.findAll({});

      expect(result).toHaveLength(1);
    });

    it('passes zoneId filter to repo', async () => {
      repo.findAll.mockResolvedValue(Either.right([]));

      await service.findAll({ zoneId: '00000000-0000-4000-8000-000000000002' });

      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          zoneId: '00000000-0000-4000-8000-000000000002',
        }),
      );
    });

    it('passes status filter to repo', async () => {
      repo.findAll.mockResolvedValue(Either.right([]));

      await service.findAll({ status: ActivityStatus.ACTIVE });

      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ status: ActivityStatus.ACTIVE }),
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
    it('returns the fellowship when found', async () => {
      const fellowship = makeFellowship();
      repo.findById.mockResolvedValue(Either.right(fellowship));

      const result = await service.findById(fellowship.id);

      expect(result.id).toBe(fellowship.id);
    });

    it('throws 404 when fellowship not found', async () => {
      repo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Fellowship not found')),
      );

      await expect(service.findById('bad-id')).rejects.toThrow(
        new HttpException('Fellowship not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('findBySlug', () => {
    it('returns the fellowship when found by slug', async () => {
      const fellowship = makeFellowship();
      repo.findBySlug.mockResolvedValue(Either.right(fellowship));

      const result = await service.findBySlug('alpha-fellowship');

      expect(result.slug).toBe('alpha-fellowship');
    });

    it('throws 404 when slug not found', async () => {
      repo.findBySlug.mockResolvedValue(
        Either.left(DataError.notFound('Fellowship not found')),
      );

      await expect(service.findBySlug('unknown')).rejects.toThrow(
        new HttpException('Fellowship not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('create', () => {
    const dto = {
      name: 'Alpha Fellowship',
      zoneId: '00000000-0000-4000-8000-000000000002',
      meetingDay: 'Sunday',
      meetingTime: '10:00',
      location: 'Hall A',
    };

    it('returns created fellowship', async () => {
      const fellowship = makeFellowship();
      repo.findByName.mockResolvedValue(Either.right(null));
      repo.create.mockResolvedValue(Either.right(fellowship));

      const result = await service.create(dto);

      expect(result.name).toBe('Alpha Fellowship');
    });

    it('throws 409 when fellowship name already exists', async () => {
      repo.findByName.mockResolvedValue(Either.right(makeFellowship()));

      const err = await service.create(dto).catch((e: HttpException) => e);

      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('throws 500 on create network error', async () => {
      repo.findByName.mockResolvedValue(Either.right(null));
      repo.create.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );

      await expect(service.create(dto)).rejects.toThrow(
        new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('update', () => {
    it('returns updated fellowship', async () => {
      const fellowship = makeFellowship({ location: 'Hall B' });
      repo.update.mockResolvedValue(Either.right(fellowship));

      const result = await service.update(fellowship.id, {
        location: 'Hall B',
      });

      expect(result.location).toBe('Hall B');
    });

    it('throws 404 when fellowship not found', async () => {
      repo.update.mockResolvedValue(
        Either.left(DataError.notFound('Fellowship not found')),
      );

      await expect(service.update('bad-id', {})).rejects.toThrow(
        new HttpException('Fellowship not found', HttpStatus.NOT_FOUND),
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

    it('throws 404 when fellowship not found', async () => {
      repo.delete.mockResolvedValue(
        Either.left(DataError.notFound('Fellowship not found')),
      );

      await expect(service.delete('bad-id')).rejects.toThrow(
        new HttpException('Fellowship not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
