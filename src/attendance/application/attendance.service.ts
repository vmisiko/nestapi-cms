import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceSessionRepository } from '../infrastructure/attendance-session.repository';
import { AttendanceRecordRepository } from '../infrastructure/attendance-record.repository';
import { AttendanceSessionEntity } from '../infrastructure/attendance-session.entity';
import { AttendanceRecordEntity } from '../infrastructure/attendance-record.entity';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import { AttendanceStatus } from '../domain/attendance-record';
import { MemberType, ChurchRole } from '../../members/domain/member';
import type { SessionSummaryDto } from '../presentation/dto/session-summary.dto';
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
    @InjectRepository(AttendanceSessionEntity)
    private readonly sessionOrm: Repository<AttendanceSessionEntity>,
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

  async getSessionsWithSummary(): Promise<SessionSummaryDto[]> {
    const rows = await this.sessionOrm
      .createQueryBuilder('s')
      .leftJoin(AttendanceRecordEntity, 'r', 'r.session_id = s.id')
      .leftJoin(MemberEntity, 'm', 'm.id = r.member_id')
      .select('s.id', 'id')
      .addSelect('s.title', 'title')
      .addSelect('s.session_type', 'sessionType')
      .addSelect('s.session_date', 'sessionDate')
      .addSelect(
        `COUNT(r.id) FILTER (WHERE r.status = '${AttendanceStatus.PRESENT}')`,
        'present',
      )
      .addSelect(
        `COUNT(r.id) FILTER (WHERE r.status = '${AttendanceStatus.ABSENT}')`,
        'absent',
      )
      .addSelect(
        `COUNT(r.id) FILTER (WHERE r.status = '${AttendanceStatus.EXCUSED}')`,
        'excused',
      )
      .addSelect(
        `COUNT(r.id) FILTER (WHERE r.status = '${AttendanceStatus.PRESENT}' AND m.member_type = '${MemberType.ADULT}')`,
        'adults',
      )
      .addSelect(
        `COUNT(r.id) FILTER (WHERE r.status = '${AttendanceStatus.PRESENT}' AND m.member_type = '${MemberType.CHILD}')`,
        'children',
      )
      .addSelect(
        `COUNT(r.id) FILTER (WHERE r.status = '${AttendanceStatus.PRESENT}' AND m.church_role = '${ChurchRole.FIRST_TIME_VISITOR}')`,
        'firstTimers',
      )
      .groupBy('s.id')
      .orderBy('s.session_date', 'DESC')
      .getRawMany<{
        id: string;
        title: string;
        sessionType: string;
        sessionDate: Date;
        present: string;
        absent: string;
        excused: string;
        adults: string;
        children: string;
        firstTimers: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      sessionType: r.sessionType,
      sessionDate: r.sessionDate,
      present: Number(r.present),
      absent: Number(r.absent),
      excused: Number(r.excused),
      adults: Number(r.adults),
      children: Number(r.children),
      firstTimers: Number(r.firstTimers),
    }));
  }
}
