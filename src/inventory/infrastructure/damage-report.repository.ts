import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DamageReportEntity } from './damage-report.entity';
import type {
  IDamageReportRepository,
  CreateDamageReportData,
  UpdateDamageReportData,
} from '../domain/i-damage-report.repository';
import type { DamageReport } from '../domain/damage-report';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class DamageReportRepository implements IDamageReportRepository {
  constructor(
    @InjectRepository(DamageReportEntity)
    private readonly orm: Repository<DamageReportEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, DamageReport[]>> {
    try {
      const entities = await this.orm.find({ order: { createdAt: 'DESC' } });
      return Either.right(entities.map(this.toReport));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch damage reports'),
      );
    }
  }

  async findByItem(itemId: string): Promise<Either<DataError, DamageReport[]>> {
    try {
      const entities = await this.orm.find({
        where: { itemId },
        order: { createdAt: 'DESC' },
      });
      return Either.right(entities.map(this.toReport));
    } catch {
      return Either.left(
        new DataError(
          'NetworkError',
          'Failed to fetch damage reports for item',
        ),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, DamageReport>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(DataError.notFound(`Damage report ${id} not found`));
      return Either.right(this.toReport(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch damage report'),
      );
    }
  }

  async create(
    data: CreateDamageReportData,
  ): Promise<Either<DataError, DamageReport>> {
    try {
      const entity = this.orm.create(data as Partial<DamageReportEntity>);
      const saved = await this.orm.save(entity);
      return Either.right(this.toReport(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create damage report'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateDamageReportData,
  ): Promise<Either<DataError, DamageReport>> {
    try {
      await this.orm.update(id, data as Partial<DamageReportEntity>);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update damage report'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(DataError.notFound(`Damage report ${id} not found`));
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete damage report'),
      );
    }
  }

  private toReport = (e: DamageReportEntity): DamageReport => ({
    id: e.id,
    itemId: e.itemId,
    quantityDamaged: e.quantityDamaged,
    description: e.description,
    reportedBy: e.reportedBy,
    status: e.status,
    resolvedAt: e.resolvedAt,
    notes: e.notes,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
