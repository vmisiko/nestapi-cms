import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentEntity } from './department.entity';
import type {
  IDepartmentRepository,
  CreateDepartmentData,
  UpdateDepartmentData,
} from '../domain/i-department.repository';
import type { Department } from '../domain/department';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class DepartmentRepository implements IDepartmentRepository {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly orm: Repository<DepartmentEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, Department[]>> {
    try {
      const entities = await this.orm.find({ order: { name: 'ASC' } });
      return Either.right(entities.map(this.toDept));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch departments'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, Department>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(DataError.notFound(`Department ${id} not found`));
      return Either.right(this.toDept(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch department'),
      );
    }
  }

  async create(
    data: CreateDepartmentData,
  ): Promise<Either<DataError, Department>> {
    try {
      const entity = this.orm.create(data);
      const saved = await this.orm.save(entity);
      return Either.right(this.toDept(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create department'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateDepartmentData,
  ): Promise<Either<DataError, Department>> {
    try {
      await this.orm.update(id, data);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update department'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(DataError.notFound(`Department ${id} not found`));
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete department'),
      );
    }
  }

  private toDept = (e: DepartmentEntity): Department => ({
    id: e.id,
    name: e.name,
    headId: e.headId,
    memberTarget: e.memberTarget,
    annualBudget: Number(e.annualBudget),
    budgetSpent: Number(e.budgetSpent),
    description: e.description,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
