import * as bcrypt from 'bcryptjs';
import type { IUserRepository } from '../../../users/domain/i-user.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';

export interface LoginParams {
  email: string;
  password: string;
}

export class LoginUseCase {
  constructor(private readonly repo: IUserRepository) {}

  async execute(params: LoginParams) {
    const result = await this.repo.findByEmail(params.email);
    if (result.isLeft()) return result as Either<DataError, never>;

    const user = result.getOrElse(null);
    if (!user) {
      return Either.left<DataError>(
        DataError.unauthorized('Invalid credentials'),
      );
    }
    if (!user.isActive) {
      return Either.left<DataError>(
        DataError.unauthorized('Account is inactive'),
      );
    }

    const valid = await bcrypt.compare(params.password, user.passwordHash);
    if (!valid) {
      return Either.left<DataError>(
        DataError.unauthorized('Invalid credentials'),
      );
    }

    return Either.right(user);
  }
}
