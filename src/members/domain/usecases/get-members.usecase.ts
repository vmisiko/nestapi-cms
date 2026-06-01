import type { IMemberRepository, MemberFilters } from '../i-member.repository';

export class GetMembersUseCase {
  constructor(private readonly repo: IMemberRepository) {}
  execute(filters?: MemberFilters) {
    return this.repo.findAll(filters);
  }
}
