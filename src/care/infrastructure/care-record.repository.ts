import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CareRecordEntity } from './care-record.entity';
import type { ICareRecordRepository } from '../domain/i-care-record.repository';
import type { CareRecord } from '../domain/care-record';
import { CareRecordStatus, CareRecordType } from '../domain/care-record';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class CareRecordRepository implements ICareRecordRepository {
  constructor(
    @InjectRepository(CareRecordEntity)
    private readonly orm: Repository<CareRecordEntity>,
  ) {}

  async findByMember(
    memberId: string,
  ): Promise<Either<DataError, CareRecord[]>> {
    try {
      const entities = await this.orm.find({
        where: { memberId },
        order: { createdAt: 'DESC' },
      });
      return Either.right(entities.map(this.toRecord));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch care records'),
      );
    }
  }

  async create(data: {
    memberId: string;
    type: CareRecordType;
    notes?: string | null;
    handledBy?: string | null;
  }): Promise<Either<DataError, CareRecord>> {
    try {
      const entity = this.orm.create({
        memberId: data.memberId,
        type: data.type,
        notes: data.notes ?? null,
        handledBy: data.handledBy ?? null,
      });
      const saved = await this.orm.save(entity);
      return Either.right(this.toRecord(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create care record'),
      );
    }
  }

  async update(
    id: string,
    data: {
      type?: CareRecordType;
      notes?: string | null;
      status?: CareRecordStatus;
      handledBy?: string | null;
    },
  ): Promise<Either<DataError, CareRecord>> {
    try {
      const record = await this.orm.findOne({ where: { id } });
      if (!record)
        return Either.left(DataError.notFound(`Care record ${id} not found`));

      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
          (record as unknown as Record<string, unknown>)[key] = value;
        }
      }
      if (data.status) {
        record.resolvedAt =
          data.status === CareRecordStatus.RESOLVED ? new Date() : null;
      }

      const saved = await this.orm.save(record);
      return Either.right(this.toRecord(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update care record'),
      );
    }
  }

  private toRecord = (e: CareRecordEntity): CareRecord => ({
    id: e.id,
    memberId: e.memberId,
    type: e.type,
    notes: e.notes ?? null,
    handledBy: e.handledBy ?? null,
    status: e.status,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    resolvedAt: e.resolvedAt ?? null,
  });
}
