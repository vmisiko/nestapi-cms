import type {
  IDepartmentRepository,
  CreateDepartmentData,
} from '../i-department.repository';

export class CreateDepartmentUseCase {
  constructor(private readonly repo: IDepartmentRepository) {}
  execute(data: CreateDepartmentData) {
    return this.repo.create(data);
  }
}
