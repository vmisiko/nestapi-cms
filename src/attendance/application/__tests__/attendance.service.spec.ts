import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { AttendanceService } from '../attendance.service';
import { AttendanceSessionRepository } from '../../infrastructure/attendance-session.repository';
import { AttendanceRecordRepository } from '../../infrastructure/attendance-record.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import { SessionType } from '../../domain/attendance-session';
import { AttendanceStatus } from '../../domain/attendance-record';

const mockSessionRepo = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockRecordRepo = {
  findBySession: jest.fn(),
  findByMember: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockSession = {
  id: 'session-uuid',
  title: 'Sunday Service',
  sessionType: SessionType.SUNDAY_SERVICE,
  sessionDate: new Date('2026-06-01'),
  fellowshipId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRecord = {
  id: 'record-uuid',
  sessionId: 'session-uuid',
  memberId: 'member-uuid',
  status: AttendanceStatus.PRESENT,
  checkedInAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: AttendanceSessionRepository, useValue: mockSessionRepo },
        { provide: AttendanceRecordRepository, useValue: mockRecordRepo },
      ],
    }).compile();
    service = module.get(AttendanceService);
  });

  describe('findAllSessions', () => {
    it('returns sessions on success', async () => {
      mockSessionRepo.findAll.mockResolvedValue(Either.right([mockSession]));
      const result = await service.findAllSessions();
      expect(result).toHaveLength(1);
    });

    it('throws HttpException on error', async () => {
      mockSessionRepo.findAll.mockResolvedValue(
        Either.left(new DataError('NetworkError', 'DB error')),
      );
      await expect(service.findAllSessions()).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });

  describe('findSessionById', () => {
    it('returns session when found', async () => {
      mockSessionRepo.findById.mockResolvedValue(Either.right(mockSession));
      const result = await service.findSessionById('session-uuid');
      expect(result.id).toBe('session-uuid');
    });

    it('throws 404 when not found', async () => {
      mockSessionRepo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Not found')),
      );
      await expect(service.findSessionById('bad')).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });

  describe('createSession', () => {
    it('creates session', async () => {
      mockSessionRepo.create.mockResolvedValue(Either.right(mockSession));
      const result = await service.createSession({
        title: 'Sunday Service',
        sessionType: SessionType.SUNDAY_SERVICE,
        sessionDate: '2026-06-01',
      });
      expect(result.id).toBe('session-uuid');
    });
  });

  describe('recordAttendance', () => {
    it('records attendance', async () => {
      mockRecordRepo.create.mockResolvedValue(Either.right(mockRecord));
      const result = await service.recordAttendance({
        sessionId: 'session-uuid',
        memberId: 'member-uuid',
        status: AttendanceStatus.PRESENT,
      });
      expect(result.id).toBe('record-uuid');
    });
  });

  describe('getSessionAttendance', () => {
    it('returns records for session', async () => {
      mockRecordRepo.findBySession.mockResolvedValue(
        Either.right([mockRecord]),
      );
      const result = await service.getSessionAttendance('session-uuid');
      expect(result).toHaveLength(1);
    });
  });

  describe('deleteSession', () => {
    it('deletes session without error', async () => {
      mockSessionRepo.delete.mockResolvedValue(Either.right(undefined));
      await expect(
        service.deleteSession('session-uuid'),
      ).resolves.toBeUndefined();
    });
  });
});
