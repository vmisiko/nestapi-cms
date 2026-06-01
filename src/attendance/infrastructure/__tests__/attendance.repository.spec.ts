import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AttendanceSessionRepository } from '../attendance-session.repository';
import { AttendanceRecordRepository } from '../attendance-record.repository';
import { AttendanceSessionEntity } from '../attendance-session.entity';
import { AttendanceRecordEntity } from '../attendance-record.entity';
import { SessionType } from '../../domain/attendance-session';
import { AttendanceStatus } from '../../domain/attendance-record';

const sessionEntity: AttendanceSessionEntity = {
  id: 'session-uuid',
  title: 'Sunday Service',
  sessionType: SessionType.SUNDAY_SERVICE,
  sessionDate: new Date('2026-06-01'),
  fellowshipId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const recordEntity: AttendanceRecordEntity = {
  id: 'record-uuid',
  sessionId: 'session-uuid',
  session: sessionEntity,
  memberId: 'member-uuid',
  status: AttendanceStatus.PRESENT,
  checkedInAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AttendanceSessionRepository', () => {
  let repo: AttendanceSessionRepository;
  let ormMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    ormMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        AttendanceSessionRepository,
        {
          provide: getRepositoryToken(AttendanceSessionEntity),
          useValue: ormMock,
        },
      ],
    }).compile();
    repo = module.get(AttendanceSessionRepository);
  });

  it('findAll returns right with sessions', async () => {
    ormMock.find.mockResolvedValue([sessionEntity]);
    const result = await repo.findAll();
    expect(result.isRight()).toBe(true);
    expect(result.getOrElse([])).toHaveLength(1);
  });

  it('findById returns NotFoundError when missing', async () => {
    ormMock.findOne.mockResolvedValue(null);
    const result = await repo.findById('bad');
    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });

  it('create saves and returns session', async () => {
    ormMock.create.mockReturnValue(sessionEntity);
    ormMock.save.mockResolvedValue(sessionEntity);
    const result = await repo.create({
      title: 'Sunday Service',
      sessionType: SessionType.SUNDAY_SERVICE,
      sessionDate: new Date(),
    });
    expect(result.isRight()).toBe(true);
  });

  it('delete returns NotFoundError when affected is 0', async () => {
    ormMock.delete.mockResolvedValue({ affected: 0 });
    const result = await repo.delete('missing-uuid');
    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });

  it('findAll returns NetworkError when orm throws', async () => {
    ormMock.find.mockRejectedValue(new Error('DB down'));
    const result = await repo.findAll();
    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });
});

describe('AttendanceRecordRepository', () => {
  let repo: AttendanceRecordRepository;
  let ormMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    ormMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const module = await Test.createTestingModule({
      providers: [
        AttendanceRecordRepository,
        {
          provide: getRepositoryToken(AttendanceRecordEntity),
          useValue: ormMock,
        },
      ],
    }).compile();
    repo = module.get(AttendanceRecordRepository);
  });

  it('findBySession returns records', async () => {
    ormMock.find.mockResolvedValue([recordEntity]);
    const result = await repo.findBySession('session-uuid');
    expect(result.isRight()).toBe(true);
  });

  it('findByMember returns records', async () => {
    ormMock.find.mockResolvedValue([recordEntity]);
    const result = await repo.findByMember('member-uuid');
    expect(result.isRight()).toBe(true);
  });

  it('create saves attendance record', async () => {
    ormMock.create.mockReturnValue(recordEntity);
    ormMock.save.mockResolvedValue(recordEntity);
    const result = await repo.create({
      sessionId: 'session-uuid',
      memberId: 'member-uuid',
      status: AttendanceStatus.PRESENT,
    });
    expect(result.isRight()).toBe(true);
  });
});
