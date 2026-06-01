import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceSessionEntity } from './attendance-session.entity';
import type {
  IAttendanceSessionRepository,
  CreateSessionData,
  UpdateSessionData,
} from '../domain/i-attendance-session.repository';
import type { AttendanceSession } from '../domain/attendance-session';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class AttendanceSessionRepository implements IAttendanceSessionRepository {
  constructor(
    @InjectRepository(AttendanceSessionEntity)
    private readonly orm: Repository<AttendanceSessionEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, AttendanceSession[]>> {
    try {
      const entities = await this.orm.find({ order: { sessionDate: 'DESC' } });
      return Either.right(entities.map(this.toSession));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch attendance sessions'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, AttendanceSession>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(
          DataError.notFound(`Attendance session ${id} not found`),
        );
      return Either.right(this.toSession(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch attendance session'),
      );
    }
  }

  async create(
    data: CreateSessionData,
  ): Promise<Either<DataError, AttendanceSession>> {
    try {
      const entity = this.orm.create(data as Partial<AttendanceSessionEntity>);
      const saved = await this.orm.save(entity);
      return Either.right(this.toSession(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create attendance session'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateSessionData,
  ): Promise<Either<DataError, AttendanceSession>> {
    try {
      await this.orm.update(id, data as Partial<AttendanceSessionEntity>);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update attendance session'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(
          DataError.notFound(`Attendance session ${id} not found`),
        );
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete attendance session'),
      );
    }
  }

  private toSession = (e: AttendanceSessionEntity): AttendanceSession => ({
    id: e.id,
    title: e.title,
    sessionType: e.sessionType,
    sessionDate: e.sessionDate,
    fellowshipId: e.fellowshipId,
    notes: e.notes,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
