import type { IMemberRepository } from '../i-member.repository';

export class GetMemberByIdUseCase {
  constructor(private readonly repo: IMemberRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}
