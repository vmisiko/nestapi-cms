import { DeleteUserUseCase } from '../delete-user.usecase';
import { IUserRepository } from '../../i-user.repository';
import { Either } from '../../../../core/domain/either';
import { DataError } from '../../../../core/domain/data-error';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
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
    useCase = new DeleteUserUseCase(repo);
  });

  it('returns void on successful deletion', async () => {
    repo.delete.mockResolvedValue(Either.right(undefined));

    const result = await useCase.execute('uuid-test-1');

    expect(result.isRight()).toBe(true);
    expect(repo.delete).toHaveBeenCalledWith('uuid-test-1');
  });

  it('returns NotFoundError when user does not exist', async () => {
    repo.delete.mockResolvedValue(
      Either.left(DataError.notFound('User not found')),
    );

    const result = await useCase.execute('non-existent');

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });

  it('propagates network error', async () => {
    repo.delete.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB error')),
    );

    const result = await useCase.execute('uuid-test-1');

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });
});
