import type {
  IMemberRepository,
  UpdateMemberData,
} from '../i-member.repository';

export class UpdateMemberUseCase {
  constructor(private readonly repo: IMemberRepository) {}
  execute(id: string, data: UpdateMemberData) {
    return this.repo.update(id, data);
  }
}
