import type { IUserRepository } from '../i-user.repository';

export class DeleteUserUseCase {
  constructor(private readonly repo: IUserRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
