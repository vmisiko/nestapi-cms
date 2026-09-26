import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CareRecordRepository } from '../care-record.repository';
import { CareRecordEntity } from '../care-record.entity';
import { CareRecordStatus, CareRecordType } from '../../domain/care-record';
import { UpdateCareRecordDto } from '../../presentation/dto/update-care-record.dto';

const makeRecord = (
  overrides: Partial<CareRecordEntity> = {},
): CareRecordEntity => {
  const record = new CareRecordEntity();
  Object.assign(record, {
    id: 'record-id',
    memberId: 'member-id',
    type: CareRecordType.HOSPITAL,
    notes: 'Original notes',
    handledBy: null,
    status: CareRecordStatus.OPEN,
    createdAt: new Date(),
    updatedAt: new Date(),
    resolvedAt: null,
    ...overrides,
  });
  return record;
};

describe('CareRecordRepository', () => {
  let repository: CareRecordRepository;
  let orm: { findOne: jest.Mock; save: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    orm = { findOne: jest.fn(), save: jest.fn(), find: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CareRecordRepository,
        { provide: getRepositoryToken(CareRecordEntity), useValue: orm },
      ],
    }).compile();

    repository = module.get(CareRecordRepository);
  });

  describe('update', () => {
    it('sets resolvedAt when the status changes to resolved', async () => {
      const record = makeRecord();
      orm.findOne.mockResolvedValue(record);
      orm.save.mockImplementation((r) => Promise.resolve(r));

      const result = await repository.update('record-id', {
        status: CareRecordStatus.RESOLVED,
      });

      const value = result.fold(
        () => null,
        (r) => r,
      );
      expect(value?.resolvedAt).toBeInstanceOf(Date);
    });

    it('clears resolvedAt when a resolved record is reopened', async () => {
      const record = makeRecord({
        status: CareRecordStatus.RESOLVED,
        resolvedAt: new Date('2026-09-10T00:00:00Z'),
      });
      orm.findOne.mockResolvedValue(record);
      orm.save.mockImplementation((r) => Promise.resolve(r));

      const result = await repository.update('record-id', {
        status: CareRecordStatus.OPEN,
      });

      const value = result.fold(
        () => null,
        (r) => r,
      );
      expect(value?.resolvedAt).toBeNull();
    });

    it('preserves type and notes when a real DTO instance only sets status (regression)', async () => {
      // UpdateCareRecordDto declares `type?`/`notes?` as class fields, which under
      // this project's ES2023 target exist as own properties with value `undefined`
      // even when omitted from the request body. A plain Object.assign merge would
      // clobber the untouched fields on the in-memory record with that undefined.
      const record = makeRecord({
        type: CareRecordType.HOSPITAL,
        notes: 'Visited at Kenyatta Hospital',
      });
      orm.findOne.mockResolvedValue(record);
      orm.save.mockImplementation((r) => Promise.resolve(r));

      const dto = new UpdateCareRecordDto();
      dto.status = CareRecordStatus.RESOLVED;

      const result = await repository.update('record-id', dto);

      const value = result.fold(
        () => null,
        (r) => r,
      );
      expect(value?.type).toBe(CareRecordType.HOSPITAL);
      expect(value?.notes).toBe('Visited at Kenyatta Hospital');
      expect(value?.status).toBe(CareRecordStatus.RESOLVED);
    });

    it('returns a not-found error when the record does not exist', async () => {
      orm.findOne.mockResolvedValue(null);

      const result = await repository.update('missing-id', {
        status: CareRecordStatus.RESOLVED,
      });

      expect(result.isLeft()).toBe(true);
      expect(orm.save).not.toHaveBeenCalled();
    });
  });
});
