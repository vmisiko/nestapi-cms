import type { IMemberRepository } from '../i-member.repository';

export class AssignMemberToDepartmentUseCase {
  constructor(private readonly repo: IMemberRepository) {}
  execute(memberId: string, departmentId: string, role?: string) {
    return this.repo.assignDepartment(memberId, departmentId, role);
  }
}
