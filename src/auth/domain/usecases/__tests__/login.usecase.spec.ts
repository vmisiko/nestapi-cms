import * as bcrypt from 'bcryptjs';
import { LoginUseCase } from '../login.usecase';
import { IUserRepository } from '../../../../users/domain/i-user.repository';
import { Either } from '../../../../core/domain/either';
import { DataError } from '../../../../core/domain/data-error';
import { makeUser } from '../../../../test/user.fixture';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let repo: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new LoginUseCase(repo);
  });

  it('returns user on valid credentials', async () => {
    const user = makeUser();
    repo.findByEmail.mockResolvedValue(Either.right(user));
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const result = await useCase.execute({
      email: user.email,
      password: 'correct',
    });

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (u) => u.id,
      ),
    ).toBe(user.id);
  });

  it('returns AuthenticationError when user not found', async () => {
    repo.findByEmail.mockResolvedValue(Either.right(null));

    const result = await useCase.execute({
      email: 'ghost@x.com',
      password: 'pw',
    });

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('AuthenticationError');
  });

  it('returns AuthenticationError when password is wrong', async () => {
    const user = makeUser();
    repo.findByEmail.mockResolvedValue(Either.right(user));
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    const result = await useCase.execute({
      email: user.email,
      password: 'wrong',
    });

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('AuthenticationError');
  });

  it('returns AuthenticationError when account is inactive', async () => {
    const user = makeUser({ isActive: false });
    repo.findByEmail.mockResolvedValue(Either.right(user));

    const result = await useCase.execute({
      email: user.email,
      password: 'any',
    });

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.message,
        () => null,
      ),
    ).toMatch(/inactive/i);
  });

  it('propagates repository error from findByEmail', async () => {
    repo.findByEmail.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB error')),
    );

    const result = await useCase.execute({ email: 'a@a.com', password: 'pw' });

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });
});
