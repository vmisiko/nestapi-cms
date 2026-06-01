import type { IDepartmentRepository } from '../i-department.repository';

export class GetDepartmentsUseCase {
  constructor(private readonly repo: IDepartmentRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
