import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UserRepository } from '../infrastructure/user.repository';
import { GetUsersUseCase } from '../domain/usecases/get-users.usecase';
import { GetUserByIdUseCase } from '../domain/usecases/get-user-by-id.usecase';
import { CreateUserUseCase } from '../domain/usecases/create-user.usecase';
import { UpdateUserUseCase } from '../domain/usecases/update-user.usecase';
import { DeleteUserUseCase } from '../domain/usecases/delete-user.usecase';
import type { CreateUserDto } from '../presentation/dto/create-user.dto';
import type { UpdateUserDto } from '../presentation/dto/update-user.dto';
import type { DataErrorKind } from '../../core/domain/data-error';
import type { User } from '../domain/user';

@Injectable()
export class UsersService {
  private readonly getUsersUseCase: GetUsersUseCase;
  private readonly getUserByIdUseCase: GetUserByIdUseCase;
  private readonly createUserUseCase: CreateUserUseCase;
  private readonly updateUserUseCase: UpdateUserUseCase;
  private readonly deleteUserUseCase: DeleteUserUseCase;

  constructor(readonly userRepository: UserRepository) {
    this.getUsersUseCase = new GetUsersUseCase(userRepository);
    this.getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
    this.createUserUseCase = new CreateUserUseCase(userRepository);
    this.updateUserUseCase = new UpdateUserUseCase(userRepository);
    this.deleteUserUseCase = new DeleteUserUseCase(userRepository);
  }

  async findAll() {
    const result = await this.getUsersUseCase.execute();
    return result.fold(
      (err) => {
        throw this.toHttp(err.kind, err.message);
      },
      (users) => users,
    );
  }

  async findById(id: string): Promise<User> {
    const result = await this.getUserByIdUseCase.execute(id);
    return result.fold(
      (err) => {
        throw this.toHttp(err.kind, err.message);
      },
      (user) => user,
    );
  }

  async findByEmail(email: string) {
    const result = await this.userRepository.findByEmail(email);
    return result.fold(
      (err) => {
        throw this.toHttp(err.kind, err.message);
      },
      (user) => user,
    );
  }

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const result = await this.createUserUseCase.execute({
      email: dto.email,
      passwordHash,
      role: dto.role,
    });
    return result.fold(
      (err) => {
        throw this.toHttp(err.kind, err.message);
      },
      (user) => user,
    );
  }

  async update(id: string, dto: UpdateUserDto) {
    const data: Record<string, unknown> = {};
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 12);

    const result = await this.updateUserUseCase.execute(id, data);
    return result.fold(
      (err) => {
        throw this.toHttp(err.kind, err.message);
      },
      (user) => user,
    );
  }

  async delete(id: string) {
    const result = await this.deleteUserUseCase.execute(id);
    return result.fold(
      (err) => {
        throw this.toHttp(err.kind, err.message);
      },
      () => undefined,
    );
  }

  async updateRefreshToken(id: string, hash: string | null) {
    const result = await this.updateUserUseCase.execute(id, {
      refreshTokenHash: hash,
    });
    return result.fold(
      (err) => {
        throw this.toHttp(err.kind, err.message);
      },
      (user) => user,
    );
  }

  async setLastLogin(id: string) {
    await this.updateUserUseCase.execute(id, { lastLoginAt: new Date() });
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    await this.updateUserUseCase.execute(id, { passwordHash });
  }

  private toHttp(kind: DataErrorKind, message: string): HttpException {
    const map: Record<DataErrorKind, HttpStatus> = {
      NotFoundError: HttpStatus.NOT_FOUND,
      ConflictError: HttpStatus.CONFLICT,
      AuthenticationError: HttpStatus.UNAUTHORIZED,
      AuthorizationError: HttpStatus.FORBIDDEN,
      ValidationError: HttpStatus.BAD_REQUEST,
      BusinessRuleError: HttpStatus.UNPROCESSABLE_ENTITY,
      NetworkError: HttpStatus.INTERNAL_SERVER_ERROR,
    };
    return new HttpException(
      message,
      map[kind] ?? HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
