import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { FellowshipZonesService } from '../fellowship-zones.service';
import { FellowshipZoneRepository } from '../../infrastructure/fellowship-zone.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import { makeZone } from '../../../test/fixtures';

const mockZoneRepository = () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

describe('FellowshipZonesService', () => {
  let service: FellowshipZonesService;
  let repo: ReturnType<typeof mockZoneRepository>;

  beforeEach(async () => {
    repo = mockZoneRepository();
    const module = await Test.createTestingModule({
      providers: [
        FellowshipZonesService,
        { provide: FellowshipZoneRepository, useValue: repo },
      ],
    }).compile();

    service = module.get(FellowshipZonesService);
  });

  describe('findAll', () => {
    it('returns array of zones', async () => {
      repo.findAll.mockResolvedValue(Either.right([makeZone()]));

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('North Zone');
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
    it('returns the zone when found', async () => {
      const zone = makeZone();
      repo.findById.mockResolvedValue(Either.right(zone));

      const result = await service.findById(zone.id);

      expect(result.id).toBe(zone.id);
    });

    it('throws 404 when zone not found', async () => {
      repo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Zone not found')),
      );

      await expect(service.findById('bad-id')).rejects.toThrow(
        new HttpException('Zone not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('create', () => {
    it('returns created zone', async () => {
      const zone = makeZone();
      repo.findByName.mockResolvedValue(Either.right(null));
      repo.create.mockResolvedValue(Either.right(zone));

      const result = await service.create({ name: 'North Zone' });

      expect(result.name).toBe('North Zone');
    });

    it('throws 409 when zone name already exists', async () => {
      repo.findByName.mockResolvedValue(Either.right(makeZone()));

      const err = await service
        .create({ name: 'North Zone' })
        .catch((e: HttpException) => e);

      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(HttpStatus.CONFLICT);
    });

    it('throws 500 on create network error', async () => {
      repo.findByName.mockResolvedValue(Either.right(null));
      repo.create.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );

      await expect(service.create({ name: 'North Zone' })).rejects.toThrow(
        new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('update', () => {
    it('returns updated zone', async () => {
      const zone = makeZone({ name: 'Updated Zone' });
      repo.update.mockResolvedValue(Either.right(zone));

      const result = await service.update(zone.id, { name: 'Updated Zone' });

      expect(result.name).toBe('Updated Zone');
    });

    it('throws 404 when zone not found', async () => {
      repo.update.mockResolvedValue(
        Either.left(DataError.notFound('Zone not found')),
      );

      await expect(service.update('bad-id', { name: 'X' })).rejects.toThrow(
        new HttpException('Zone not found', HttpStatus.NOT_FOUND),
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

    it('throws 404 when zone not found', async () => {
      repo.delete.mockResolvedValue(
        Either.left(DataError.notFound('Zone not found')),
      );

      await expect(service.delete('bad-id')).rejects.toThrow(
        new HttpException('Zone not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
