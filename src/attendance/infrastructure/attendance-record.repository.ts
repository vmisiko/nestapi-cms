import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AttendanceRecordEntity } from './attendance-record.entity';
import type {
  IAttendanceRecordRepository,
  CreateRecordData,
  UpdateRecordData,
} from '../domain/i-attendance-record.repository';
import type { AttendanceRecord } from '../domain/attendance-record';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class AttendanceRecordRepository implements IAttendanceRecordRepository {
  constructor(
    @InjectRepository(AttendanceRecordEntity)
    private readonly orm: Repository<AttendanceRecordEntity>,
  ) {}

  async findBySession(
    sessionId: string,
  ): Promise<Either<DataError, AttendanceRecord[]>> {
    try {
      const entities = await this.orm.find({
        where: { sessionId },
        order: { createdAt: 'ASC' },
      });
      return Either.right(entities.map(this.toRecord));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch session attendance'),
      );
    }
  }

  async findByMember(
    memberId: string,
  ): Promise<Either<DataError, AttendanceRecord[]>> {
    try {
      const entities = await this.orm.find({
        where: { memberId },
        order: { createdAt: 'DESC' },
      });
      return Either.right(entities.map(this.toRecord));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch member attendance'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, AttendanceRecord>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(
          DataError.notFound(`Attendance record ${id} not found`),
        );
      return Either.right(this.toRecord(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch attendance record'),
      );
    }
  }

  async create(
    data: CreateRecordData,
  ): Promise<Either<DataError, AttendanceRecord>> {
    try {
      const entity = this.orm.create(data as Partial<AttendanceRecordEntity>);
      const saved = await this.orm.save(entity);
      return Either.right(this.toRecord(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to record attendance'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateRecordData,
  ): Promise<Either<DataError, AttendanceRecord>> {
    try {
      await this.orm.update(id, data as Partial<AttendanceRecordEntity>);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update attendance record'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(
          DataError.notFound(`Attendance record ${id} not found`),
        );
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete attendance record'),
      );
    }
  }

  private toRecord = (e: AttendanceRecordEntity): AttendanceRecord => ({
    id: e.id,
    sessionId: e.sessionId,
    memberId: e.memberId,
    status: e.status,
    checkedInAt: e.checkedInAt,
    notes: e.notes,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
