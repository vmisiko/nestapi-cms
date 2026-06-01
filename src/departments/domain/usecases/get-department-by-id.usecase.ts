import type { IDepartmentRepository } from '../i-department.repository';

export class GetDepartmentByIdUseCase {
  constructor(private readonly repo: IDepartmentRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}
