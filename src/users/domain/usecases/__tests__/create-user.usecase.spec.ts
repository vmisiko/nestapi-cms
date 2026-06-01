import { CreateUserUseCase } from './create-user.usecase';
import { IUserRepository } from '../i-user.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import { makeUser } from '../../../test/user.fixture';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let repo: jest.Mocked<IUserRepository>;

  const params = {
    email: 'new@citymega.org',
    passwordHash: '$2a$12$hashedpw',
  };

  beforeEach(() => {
    repo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    useCase = new CreateUserUseCase(repo);
  });

  it('creates user when email is not taken', async () => {
    const created = makeUser({ email: params.email });
    repo.findByEmail.mockResolvedValue(Either.right(null));
    repo.create.mockResolvedValue(Either.right(created));

    const result = await useCase.execute(params);

    expect(result.isRight()).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(params);
  });

  it('returns ConflictError when email is already registered', async () => {
    repo.findByEmail.mockResolvedValue(Either.right(makeUser()));

    const result = await useCase.execute(params);

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('ConflictError');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('propagates repository error from findByEmail', async () => {
    repo.findByEmail.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB error')),
    );

    const result = await useCase.execute(params);

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('propagates repository error from create', async () => {
    repo.findByEmail.mockResolvedValue(Either.right(null));
    repo.create.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'Failed to create')),
    );

    const result = await useCase.execute(params);

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });
});
