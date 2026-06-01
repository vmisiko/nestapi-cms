import { GetUserByIdUseCase } from '../get-user-by-id.usecase';
import { IUserRepository } from '../../i-user.repository';
import { Either } from '../../../../core/domain/either';
import { DataError } from '../../../../core/domain/data-error';
import { makeUser } from '../../../../test/user.fixture';

describe('GetUserByIdUseCase', () => {
  let useCase: GetUserByIdUseCase;
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
    useCase = new GetUserByIdUseCase(repo);
  });

  it('returns the user when found', async () => {
    const user = makeUser();
    repo.findById.mockResolvedValue(Either.right(user));

    const result = await useCase.execute(user.id);

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (u) => u.id,
      ),
    ).toBe(user.id);
  });

  it('returns NotFoundError when user does not exist', async () => {
    repo.findById.mockResolvedValue(
      Either.left(DataError.notFound('User not found')),
    );

    const result = await useCase.execute('non-existent-id');

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });

  it('propagates network error from repository', async () => {
    repo.findById.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB error')),
    );

    const result = await useCase.execute('any-id');

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });
});
