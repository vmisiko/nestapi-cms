import type { IDepartmentRepository } from '../i-department.repository';

export class DeleteDepartmentUseCase {
  constructor(private readonly repo: IDepartmentRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
