import type {
  IDepartmentRepository,
  UpdateDepartmentData,
} from '../i-department.repository';

export class UpdateDepartmentUseCase {
  constructor(private readonly repo: IDepartmentRepository) {}
  execute(id: string, data: UpdateDepartmentData) {
    return this.repo.update(id, data);
  }
}
