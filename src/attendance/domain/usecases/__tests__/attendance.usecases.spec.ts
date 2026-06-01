import { Either } from '../../../../core/domain/either';
import { DataError } from '../../../../core/domain/data-error';
import { CreateSessionUseCase } from '../create-session.usecase';
import { GetSessionsUseCase } from '../get-sessions.usecase';
import { GetSessionByIdUseCase } from '../get-session-by-id.usecase';
import { UpdateSessionUseCase } from '../update-session.usecase';
import { DeleteSessionUseCase } from '../delete-session.usecase';
import { RecordAttendanceUseCase } from '../record-attendance.usecase';
import { GetSessionAttendanceUseCase } from '../get-session-attendance.usecase';
import { GetMemberAttendanceUseCase } from '../get-member-attendance.usecase';
import { UpdateAttendanceRecordUseCase } from '../update-attendance-record.usecase';
import { DeleteAttendanceRecordUseCase } from '../delete-attendance-record.usecase';
import type { IAttendanceSessionRepository } from '../../i-attendance-session.repository';
import type { IAttendanceRecordRepository } from '../../i-attendance-record.repository';
import { SessionType, type AttendanceSession } from '../../attendance-session';
import {
  AttendanceStatus,
  type AttendanceRecord,
} from '../../attendance-record';

const mockSession: AttendanceSession = {
  id: 'session-uuid',
  title: 'Sunday Service',
  sessionType: SessionType.SUNDAY_SERVICE,
  sessionDate: new Date('2026-06-01'),
  fellowshipId: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRecord: AttendanceRecord = {
  id: 'record-uuid',
  sessionId: 'session-uuid',
  memberId: 'member-uuid',
  status: AttendanceStatus.PRESENT,
  checkedInAt: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Attendance Session Use Cases', () => {
  let sessionRepo: jest.Mocked<IAttendanceSessionRepository>;

  beforeEach(() => {
    sessionRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  describe('GetSessionsUseCase', () => {
    it('returns all sessions', async () => {
      sessionRepo.findAll.mockResolvedValue(Either.right([mockSession]));
      const result = await new GetSessionsUseCase(sessionRepo).execute();
      expect(result.isRight()).toBe(true);
      expect(result.getOrElse([])).toHaveLength(1);
    });
  });

  describe('GetSessionByIdUseCase', () => {
    it('returns session when found', async () => {
      sessionRepo.findById.mockResolvedValue(Either.right(mockSession));
      const result = await new GetSessionByIdUseCase(sessionRepo).execute(
        'session-uuid',
      );
      expect(result.isRight()).toBe(true);
    });

    it('returns NotFoundError when session missing', async () => {
      sessionRepo.findById.mockResolvedValue(
        Either.left(DataError.notFound('Session not found')),
      );
      const result = await new GetSessionByIdUseCase(sessionRepo).execute(
        'bad-id',
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

  describe('CreateSessionUseCase', () => {
    it('creates session and returns it', async () => {
      sessionRepo.create.mockResolvedValue(Either.right(mockSession));
      const result = await new CreateSessionUseCase(sessionRepo).execute({
        title: 'Sunday Service',
        sessionType: SessionType.SUNDAY_SERVICE,
        sessionDate: new Date('2026-06-01'),
      });
      expect(result.isRight()).toBe(true);
      expect(sessionRepo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('UpdateSessionUseCase', () => {
    it('updates session', async () => {
      sessionRepo.update.mockResolvedValue(
        Either.right({ ...mockSession, title: 'Updated' }),
      );
      const result = await new UpdateSessionUseCase(sessionRepo).execute(
        'session-uuid',
        { title: 'Updated' },
      );
      expect(result.isRight()).toBe(true);
    });
  });

  describe('DeleteSessionUseCase', () => {
    it('deletes session', async () => {
      sessionRepo.delete.mockResolvedValue(Either.right(undefined));
      const result = await new DeleteSessionUseCase(sessionRepo).execute(
        'session-uuid',
      );
      expect(result.isRight()).toBe(true);
    });

    it('returns NotFoundError when session missing', async () => {
      sessionRepo.delete.mockResolvedValue(
        Either.left(DataError.notFound('Not found')),
      );
      const result = await new DeleteSessionUseCase(sessionRepo).execute(
        'bad-id',
      );
      expect(result.isLeft()).toBe(true);
    });
  });
});

describe('Attendance Record Use Cases', () => {
  let recordRepo: jest.Mocked<IAttendanceRecordRepository>;

  beforeEach(() => {
    recordRepo = {
      findBySession: jest.fn(),
      findByMember: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
  });

  describe('RecordAttendanceUseCase', () => {
    it('creates attendance record', async () => {
      recordRepo.create.mockResolvedValue(Either.right(mockRecord));
      const result = await new RecordAttendanceUseCase(recordRepo).execute({
        sessionId: 'session-uuid',
        memberId: 'member-uuid',
        status: AttendanceStatus.PRESENT,
      });
      expect(result.isRight()).toBe(true);
    });
  });

  describe('GetSessionAttendanceUseCase', () => {
    it('returns records for session', async () => {
      recordRepo.findBySession.mockResolvedValue(Either.right([mockRecord]));
      const result = await new GetSessionAttendanceUseCase(recordRepo).execute(
        'session-uuid',
      );
      expect(result.isRight()).toBe(true);
      expect(result.getOrElse([])).toHaveLength(1);
    });
  });

  describe('GetMemberAttendanceUseCase', () => {
    it('returns records for member', async () => {
      recordRepo.findByMember.mockResolvedValue(Either.right([mockRecord]));
      const result = await new GetMemberAttendanceUseCase(recordRepo).execute(
        'member-uuid',
      );
      expect(result.isRight()).toBe(true);
    });
  });

  describe('UpdateAttendanceRecordUseCase', () => {
    it('updates record', async () => {
      recordRepo.update.mockResolvedValue(
        Either.right({ ...mockRecord, status: AttendanceStatus.EXCUSED }),
      );
      const result = await new UpdateAttendanceRecordUseCase(
        recordRepo,
      ).execute('record-uuid', {
        status: AttendanceStatus.EXCUSED,
      });
      expect(result.isRight()).toBe(true);
    });
  });

  describe('DeleteAttendanceRecordUseCase', () => {
    it('deletes record', async () => {
      recordRepo.delete.mockResolvedValue(Either.right(undefined));
      const result = await new DeleteAttendanceRecordUseCase(
        recordRepo,
      ).execute('record-uuid');
      expect(result.isRight()).toBe(true);
    });
  });
});
