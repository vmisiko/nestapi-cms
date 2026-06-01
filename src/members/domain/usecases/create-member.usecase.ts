import type {
  IMemberRepository,
  CreateMemberData,
} from '../i-member.repository';

export class CreateMemberUseCase {
  constructor(private readonly repo: IMemberRepository) {}
  execute(data: CreateMemberData) {
    return this.repo.create(data);
  }
}
