import { Test } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CareService } from '../care.service';
import { CareRecordRepository } from '../../infrastructure/care-record.repository';
import { CareRecordType, CareRecordStatus } from '../../domain/care-record';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';

const DATE = new Date('2026-09-20T00:00:00Z');
const MEMBER_ID = '00000000-0000-4000-8000-000000000001';
const RECORD_ID = '00000000-0000-4000-8000-000000000020';
const USER_ID = '00000000-0000-4000-8000-000000000030';

const makeRecord = (overrides = {}) => ({
  id: RECORD_ID,
  memberId: MEMBER_ID,
  type: CareRecordType.VISIT,
  notes: null,
  handledBy: USER_ID,
  status: CareRecordStatus.OPEN,
  createdAt: DATE,
  updatedAt: DATE,
  resolvedAt: null,
  ...overrides,
});

const mockRepo = () => ({
  findByMember: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
});

describe('CareService', () => {
  let service: CareService;
  let repo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    repo = mockRepo();

    const module = await Test.createTestingModule({
      providers: [
        CareService,
        { provide: CareRecordRepository, useValue: repo },
      ],
    }).compile();

    service = module.get(CareService);
  });

  describe('findByMember', () => {
    it("returns a member's care records", async () => {
      repo.findByMember.mockResolvedValue(Either.right([makeRecord()]));

      const result = await service.findByMember(MEMBER_ID);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(CareRecordType.VISIT);
    });

    it('throws on repository error', async () => {
      repo.findByMember.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );

      await expect(service.findByMember(MEMBER_ID)).rejects.toThrow(
        new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR),
      );
    });
  });

  describe('create', () => {
    it('creates a care record with the acting user as handler', async () => {
      repo.create.mockResolvedValue(Either.right(makeRecord()));

      const result = await service.create(
        MEMBER_ID,
        { type: CareRecordType.VISIT, notes: 'Home visit' },
        USER_ID,
      );

      expect(repo.create).toHaveBeenCalledWith({
        memberId: MEMBER_ID,
        type: CareRecordType.VISIT,
        notes: 'Home visit',
        handledBy: USER_ID,
      });
      expect(result.handledBy).toBe(USER_ID);
    });
  });

  describe('update', () => {
    it('returns the updated record', async () => {
      repo.update.mockResolvedValue(
        Either.right(
          makeRecord({
            status: CareRecordStatus.RESOLVED,
            resolvedAt: DATE,
          }),
        ),
      );

      const result = await service.update(RECORD_ID, {
        status: CareRecordStatus.RESOLVED,
      });

      expect(result.status).toBe(CareRecordStatus.RESOLVED);
      expect(result.resolvedAt).toEqual(DATE);
    });

    it('throws 404 when the care record does not exist', async () => {
      repo.update.mockResolvedValue(
        Either.left(DataError.notFound('Care record not found')),
      );

      await expect(
        service.update(RECORD_ID, { status: CareRecordStatus.RESOLVED }),
      ).rejects.toThrow(
        new HttpException('Care record not found', HttpStatus.NOT_FOUND),
      );
    });
  });
});
