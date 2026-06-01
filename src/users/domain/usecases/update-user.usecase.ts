import type { IUserRepository, UpdateUserData } from '../i-user.repository';

export class UpdateUserUseCase {
  constructor(private readonly repo: IUserRepository) {}
  execute(id: string, data: UpdateUserData) {
    return this.repo.update(id, data);
  }
}
