import { UpdateUserUseCase } from './update-user.usecase';
import { IUserRepository } from '../i-user.repository';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import { UserRole } from '../user';
import { makeUser } from '../../../test/user.fixture';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
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
    useCase = new UpdateUserUseCase(repo);
  });

  it('returns updated user on success', async () => {
    const updated = makeUser({ role: UserRole.ADMIN });
    repo.update.mockResolvedValue(Either.right(updated));

    const result = await useCase.execute('uuid-test-1', {
      role: UserRole.ADMIN,
    });

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (u) => u.role,
      ),
    ).toBe(UserRole.ADMIN);
    expect(repo.update).toHaveBeenCalledWith('uuid-test-1', {
      role: UserRole.ADMIN,
    });
  });

  it('returns NotFoundError when user does not exist', async () => {
    repo.update.mockResolvedValue(
      Either.left(DataError.notFound('User not found')),
    );

    const result = await useCase.execute('bad-id', { isActive: false });

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });

  it('propagates network error', async () => {
    repo.update.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB error')),
    );

    const result = await useCase.execute('uuid-test-1', {});

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });
});
