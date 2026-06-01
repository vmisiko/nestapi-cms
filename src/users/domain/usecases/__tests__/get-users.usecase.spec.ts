import { GetUsersUseCase } from '../get-users.usecase';
import { IUserRepository } from '../../i-user.repository';
import { Either } from '../../../../core/domain/either';
import { DataError } from '../../../../core/domain/data-error';
import { makeUser } from '../../../../test/user.fixture';

describe('GetUsersUseCase', () => {
  let useCase: GetUsersUseCase;
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
    useCase = new GetUsersUseCase(repo);
  });

  it('returns all users', async () => {
    const users = [makeUser(), makeUser({ id: 'uuid-2', email: 'b@b.com' })];
    repo.findAll.mockResolvedValue(Either.right(users));

    const result = await useCase.execute();

    expect(result.isRight()).toBe(true);
    expect(result.getOrElse([])).toHaveLength(2);
  });

  it('returns empty array when no users exist', async () => {
    repo.findAll.mockResolvedValue(Either.right([]));

    const result = await useCase.execute();

    expect(result.isRight()).toBe(true);
    expect(result.getOrElse([])).toHaveLength(0);
  });

  it('propagates network error from repository', async () => {
    repo.findAll.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB unreachable')),
    );

    const result = await useCase.execute();

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });
});
