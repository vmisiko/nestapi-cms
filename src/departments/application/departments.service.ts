import { Injectable } from '@nestjs/common';
import { DepartmentRepository } from '../infrastructure/department.repository';
import { GetDepartmentsUseCase } from '../domain/usecases/get-departments.usecase';
import { GetDepartmentByIdUseCase } from '../domain/usecases/get-department-by-id.usecase';
import { CreateDepartmentUseCase } from '../domain/usecases/create-department.usecase';
import { UpdateDepartmentUseCase } from '../domain/usecases/update-department.usecase';
import { DeleteDepartmentUseCase } from '../domain/usecases/delete-department.usecase';
import type { CreateDepartmentDto } from '../presentation/dto/create-department.dto';
import type { UpdateDepartmentDto } from '../presentation/dto/update-department.dto';
import type { Department } from '../domain/department';
import { toHttpException } from '../../core/application/http-exception.util';

@Injectable()
export class DepartmentsService {
  private readonly getAll: GetDepartmentsUseCase;
  private readonly getById: GetDepartmentByIdUseCase;
  private readonly createUseCase: CreateDepartmentUseCase;
  private readonly updateUseCase: UpdateDepartmentUseCase;
  private readonly deleteUseCase: DeleteDepartmentUseCase;

  constructor(readonly repo: DepartmentRepository) {
    this.getAll = new GetDepartmentsUseCase(repo);
    this.getById = new GetDepartmentByIdUseCase(repo);
    this.createUseCase = new CreateDepartmentUseCase(repo);
    this.updateUseCase = new UpdateDepartmentUseCase(repo);
    this.deleteUseCase = new DeleteDepartmentUseCase(repo);
  }

  async findAll(): Promise<Department[]> {
    const result = await this.getAll.execute();
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async findById(id: string): Promise<Department> {
    const result = await this.getById.execute(id);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async create(dto: CreateDepartmentDto): Promise<Department> {
    const result = await this.createUseCase.execute(dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<Department> {
    const result = await this.updateUseCase.execute(id, dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async delete(id: string): Promise<void> {
    const result = await this.deleteUseCase.execute(id);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }
}
