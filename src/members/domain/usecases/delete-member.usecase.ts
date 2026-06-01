import type { IMemberRepository } from '../i-member.repository';

export class DeleteMemberUseCase {
  constructor(private readonly repo: IMemberRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
