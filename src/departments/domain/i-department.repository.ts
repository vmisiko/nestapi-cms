import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { Department } from './department';

export interface CreateDepartmentData {
  name: string;
  headId?: string | null;
  memberTarget?: number;
  annualBudget?: number;
  description?: string | null;
}

export interface UpdateDepartmentData {
  name?: string;
  headId?: string | null;
  memberTarget?: number;
  annualBudget?: number;
  budgetSpent?: number;
  description?: string | null;
}

export interface IDepartmentRepository {
  findAll(): Promise<Either<DataError, Department[]>>;
  findById(id: string): Promise<Either<DataError, Department>>;
  create(data: CreateDepartmentData): Promise<Either<DataError, Department>>;
  update(
    id: string,
    data: UpdateDepartmentData,
  ): Promise<Either<DataError, Department>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
