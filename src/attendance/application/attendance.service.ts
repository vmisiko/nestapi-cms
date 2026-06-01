import { Injectable } from '@nestjs/common';
import { AttendanceSessionRepository } from '../infrastructure/attendance-session.repository';
import { AttendanceRecordRepository } from '../infrastructure/attendance-record.repository';
import { CreateSessionUseCase } from '../domain/usecases/create-session.usecase';
import { GetSessionsUseCase } from '../domain/usecases/get-sessions.usecase';
import { GetSessionByIdUseCase } from '../domain/usecases/get-session-by-id.usecase';
import { UpdateSessionUseCase } from '../domain/usecases/update-session.usecase';
import { DeleteSessionUseCase } from '../domain/usecases/delete-session.usecase';
import { RecordAttendanceUseCase } from '../domain/usecases/record-attendance.usecase';
import { GetSessionAttendanceUseCase } from '../domain/usecases/get-session-attendance.usecase';
import { GetMemberAttendanceUseCase } from '../domain/usecases/get-member-attendance.usecase';
import { UpdateAttendanceRecordUseCase } from '../domain/usecases/update-attendance-record.usecase';
import { DeleteAttendanceRecordUseCase } from '../domain/usecases/delete-attendance-record.usecase';
import type { CreateSessionDto } from '../presentation/dto/create-session.dto';
import type { UpdateSessionDto } from '../presentation/dto/update-session.dto';
import type { RecordAttendanceDto } from '../presentation/dto/record-attendance.dto';
import type { UpdateAttendanceRecordDto } from '../presentation/dto/update-attendance-record.dto';
import type { AttendanceSession } from '../domain/attendance-session';
import type { AttendanceRecord } from '../domain/attendance-record';
import { toHttpException } from '../../core/application/http-exception.util';

@Injectable()
export class AttendanceService {
  private readonly getSessionsUseCase: GetSessionsUseCase;
  private readonly getSessionByIdUseCase: GetSessionByIdUseCase;
  private readonly createSessionUseCase: CreateSessionUseCase;
  private readonly updateSessionUseCase: UpdateSessionUseCase;
  private readonly deleteSessionUseCase: DeleteSessionUseCase;
  private readonly recordAttendanceUseCase: RecordAttendanceUseCase;
  private readonly getSessionAttendanceUseCase: GetSessionAttendanceUseCase;
  private readonly getMemberAttendanceUseCase: GetMemberAttendanceUseCase;
  private readonly updateRecordUseCase: UpdateAttendanceRecordUseCase;
  private readonly deleteRecordUseCase: DeleteAttendanceRecordUseCase;

  constructor(
    readonly sessionRepo: AttendanceSessionRepository,
    readonly recordRepo: AttendanceRecordRepository,
  ) {
    this.getSessionsUseCase = new GetSessionsUseCase(sessionRepo);
    this.getSessionByIdUseCase = new GetSessionByIdUseCase(sessionRepo);
    this.createSessionUseCase = new CreateSessionUseCase(sessionRepo);
    this.updateSessionUseCase = new UpdateSessionUseCase(sessionRepo);
    this.deleteSessionUseCase = new DeleteSessionUseCase(sessionRepo);
    this.recordAttendanceUseCase = new RecordAttendanceUseCase(recordRepo);
    this.getSessionAttendanceUseCase = new GetSessionAttendanceUseCase(
      recordRepo,
    );
    this.getMemberAttendanceUseCase = new GetMemberAttendanceUseCase(
      recordRepo,
    );
    this.updateRecordUseCase = new UpdateAttendanceRecordUseCase(recordRepo);
    this.deleteRecordUseCase = new DeleteAttendanceRecordUseCase(recordRepo);
  }

  async findAllSessions(): Promise<AttendanceSession[]> {
    const result = await this.getSessionsUseCase.execute();
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async findSessionById(id: string): Promise<AttendanceSession> {
    const result = await this.getSessionByIdUseCase.execute(id);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async createSession(dto: CreateSessionDto): Promise<AttendanceSession> {
    const result = await this.createSessionUseCase.execute({
      ...dto,
      sessionDate: new Date(dto.sessionDate),
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async updateSession(
    id: string,
    dto: UpdateSessionDto,
  ): Promise<AttendanceSession> {
    const result = await this.updateSessionUseCase.execute(id, {
      title: dto.title,
      sessionType: dto.sessionType,
      sessionDate: dto.sessionDate ? new Date(dto.sessionDate) : undefined,
      fellowshipId: dto.fellowshipId,
      notes: dto.notes,
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async deleteSession(id: string): Promise<void> {
    const result = await this.deleteSessionUseCase.execute(id);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }

  async recordAttendance(dto: RecordAttendanceDto): Promise<AttendanceRecord> {
    const result = await this.recordAttendanceUseCase.execute({
      sessionId: dto.sessionId,
      memberId: dto.memberId,
      status: dto.status,
      checkedInAt: dto.checkedInAt ? new Date(dto.checkedInAt) : null,
      notes: dto.notes,
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
    const result = await this.getSessionAttendanceUseCase.execute(sessionId);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async getMemberAttendance(memberId: string): Promise<AttendanceRecord[]> {
    const result = await this.getMemberAttendanceUseCase.execute(memberId);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async updateRecord(
    id: string,
    dto: UpdateAttendanceRecordDto,
  ): Promise<AttendanceRecord> {
    const result = await this.updateRecordUseCase.execute(id, {
      status: dto.status,
      checkedInAt: dto.checkedInAt ? new Date(dto.checkedInAt) : undefined,
      notes: dto.notes,
    });
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async deleteRecord(id: string): Promise<void> {
    const result = await this.deleteRecordUseCase.execute(id);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }
}
