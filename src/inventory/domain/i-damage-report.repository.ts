import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { DamageReport } from './damage-report';

export interface CreateDamageReportData {
  itemId: string;
  quantityDamaged: number;
  description: string;
  reportedBy: string;
  notes?: string | null;
}

export interface UpdateDamageReportData {
  status?: string;
  resolvedAt?: Date | null;
  notes?: string | null;
}

export interface IDamageReportRepository {
  findAll(): Promise<Either<DataError, DamageReport[]>>;
  findByItem(itemId: string): Promise<Either<DataError, DamageReport[]>>;
  findById(id: string): Promise<Either<DataError, DamageReport>>;
  create(
    data: CreateDamageReportData,
  ): Promise<Either<DataError, DamageReport>>;
  update(
    id: string,
    data: UpdateDamageReportData,
  ): Promise<Either<DataError, DamageReport>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
