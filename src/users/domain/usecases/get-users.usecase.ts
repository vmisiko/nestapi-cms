import type { IUserRepository } from '../i-user.repository';

export class GetUsersUseCase {
  constructor(private readonly repo: IUserRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
