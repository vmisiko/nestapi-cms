import type { IUserRepository } from '../i-user.repository';
import type { User, UserRole } from '../user';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';

export interface CreateUserParams {
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export class CreateUserUseCase {
  constructor(private readonly repo: IUserRepository) {}

  async execute(params: CreateUserParams): Promise<Either<DataError, User>> {
    const existing = await this.repo.findByEmail(params.email);

    if (existing.isLeft()) {
      return existing as unknown as Either<DataError, User>;
    }

    const existingUser = existing.fold<User | null>(
      () => null,
      (u) => u,
    );
    if (existingUser !== null) {
      return Either.left<DataError, User>(
        DataError.conflict(`Email ${params.email} is already registered`),
      );
    }

    return this.repo.create(params);
  }
}
