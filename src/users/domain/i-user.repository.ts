import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { User, UserRole } from './user';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export interface UpdateUserData {
  role?: UserRole;
  isActive?: boolean;
  passwordHash?: string;
  refreshTokenHash?: string | null;
  lastLoginAt?: Date;
}

export interface IUserRepository {
  findAll(): Promise<Either<DataError, User[]>>;
  findById(id: string): Promise<Either<DataError, User>>;
  findByEmail(email: string): Promise<Either<DataError, User | null>>;
  create(data: CreateUserData): Promise<Either<DataError, User>>;
  update(id: string, data: UpdateUserData): Promise<Either<DataError, User>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
