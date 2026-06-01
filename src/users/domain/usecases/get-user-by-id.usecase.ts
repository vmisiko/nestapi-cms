import type { IUserRepository } from '../i-user.repository';

export class GetUserByIdUseCase {
  constructor(private readonly repo: IUserRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}
