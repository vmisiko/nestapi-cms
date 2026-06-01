import type { IMemberRepository } from '../i-member.repository';

export class RemoveMemberFromDepartmentUseCase {
  constructor(private readonly repo: IMemberRepository) {}
  execute(memberId: string, departmentId: string) {
    return this.repo.removeDepartment(memberId, departmentId);
  }
}
