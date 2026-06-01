import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './user.entity';
import type {
  IUserRepository,
  CreateUserData,
  UpdateUserData,
} from '../domain/i-user.repository';
import type { User } from '../domain/user';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly orm: Repository<UserEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, User[]>> {
    try {
      const entities = await this.orm.find({ order: { createdAt: 'DESC' } });
      return Either.right(entities.map(this.toUser));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch users'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, User>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(DataError.notFound(`User ${id} not found`));
      return Either.right(this.toUser(entity));
    } catch {
      return Either.left(new DataError('NetworkError', 'Failed to fetch user'));
    }
  }

  async findByEmail(email: string): Promise<Either<DataError, User | null>> {
    try {
      const entity = await this.orm.findOne({ where: { email } });
      return Either.right(entity ? this.toUser(entity) : null);
    } catch {
      return Either.left(new DataError('NetworkError', 'Failed to fetch user'));
    }
  }

  async create(data: CreateUserData): Promise<Either<DataError, User>> {
    try {
      const entity = this.orm.create(data);
      const saved = await this.orm.save(entity);
      return Either.right(this.toUser(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create user'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateUserData,
  ): Promise<Either<DataError, User>> {
    try {
      await this.orm.update(id, data);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update user'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0) {
        return Either.left(DataError.notFound(`User ${id} not found`));
      }
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete user'),
      );
    }
  }

  private toUser = (entity: UserEntity): User => ({
    id: entity.id,
    email: entity.email,
    passwordHash: entity.passwordHash,
    role: entity.role,
    isActive: entity.isActive,
    refreshTokenHash: entity.refreshTokenHash,
    lastLoginAt: entity.lastLoginAt,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
}
