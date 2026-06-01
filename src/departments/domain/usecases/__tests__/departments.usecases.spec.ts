import { Either } from '../../../../core/domain/either';
import { DataError } from '../../../../core/domain/data-error';
import { IDepartmentRepository } from '../../i-department.repository';
import { makeDepartment } from '../../../../test/fixtures';
import { CreateDepartmentUseCase } from '../create-department.usecase';
import { GetDepartmentsUseCase } from '../get-departments.usecase';
import { GetDepartmentByIdUseCase } from '../get-department-by-id.usecase';
import { UpdateDepartmentUseCase } from '../update-department.usecase';
import { DeleteDepartmentUseCase } from '../delete-department.usecase';

const makeRepo = (): jest.Mocked<IDepartmentRepository> => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

// ---------------------------------------------------------------------------
// GetDepartmentsUseCase
// ---------------------------------------------------------------------------
describe('GetDepartmentsUseCase', () => {
  it('returns all departments from repository', async () => {
    const repo = makeRepo();
    repo.findAll.mockResolvedValue(Either.right([makeDepartment()]));

    const result = await new GetDepartmentsUseCase(repo).execute();

    expect(result.isRight()).toBe(true);
    expect(result.getOrElse([])).toHaveLength(1);
  });

  it('propagates repository error', async () => {
    const repo = makeRepo();
    repo.findAll.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB error')),
    );

    const result = await new GetDepartmentsUseCase(repo).execute();

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });
});

// ---------------------------------------------------------------------------
// GetDepartmentByIdUseCase
// ---------------------------------------------------------------------------
describe('GetDepartmentByIdUseCase', () => {
  it('returns department when found', async () => {
    const repo = makeRepo();
    const dept = makeDepartment();
    repo.findById.mockResolvedValue(Either.right(dept));

    const result = await new GetDepartmentByIdUseCase(repo).execute(dept.id);

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (d) => d.id,
      ),
    ).toBe(dept.id);
  });

  it('returns NotFoundError when not found', async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(
      Either.left(DataError.notFound('Department not found')),
    );

    const result = await new GetDepartmentByIdUseCase(repo).execute('bad-id');

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });
});

// ---------------------------------------------------------------------------
// CreateDepartmentUseCase
// ---------------------------------------------------------------------------
describe('CreateDepartmentUseCase', () => {
  it('creates department via repository', async () => {
    const repo = makeRepo();
    const dept = makeDepartment();
    repo.create.mockResolvedValue(Either.right(dept));

    const result = await new CreateDepartmentUseCase(repo).execute({
      name: 'Worship Department',
    });

    expect(result.isRight()).toBe(true);
    expect(repo.create).toHaveBeenCalledWith({ name: 'Worship Department' });
  });

  it('propagates repository error', async () => {
    const repo = makeRepo();
    repo.create.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'Failed to create')),
    );

    const result = await new CreateDepartmentUseCase(repo).execute({
      name: 'Worship Department',
    });

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });
});

// ---------------------------------------------------------------------------
// UpdateDepartmentUseCase
// ---------------------------------------------------------------------------
describe('UpdateDepartmentUseCase', () => {
  it('delegates to repo.update and returns updated department', async () => {
    const repo = makeRepo();
    const dept = makeDepartment({ name: 'Media Department' });
    repo.update.mockResolvedValue(Either.right(dept));

    const result = await new UpdateDepartmentUseCase(repo).execute(dept.id, {
      name: 'Media Department',
    });

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (d) => d.name,
      ),
    ).toBe('Media Department');
  });

  it('returns NotFoundError when department does not exist', async () => {
    const repo = makeRepo();
    repo.update.mockResolvedValue(
      Either.left(DataError.notFound('Department not found')),
    );

    const result = await new UpdateDepartmentUseCase(repo).execute('bad-id', {
      name: 'X',
    });

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });
});

// ---------------------------------------------------------------------------
// DeleteDepartmentUseCase
// ---------------------------------------------------------------------------
describe('DeleteDepartmentUseCase', () => {
  it('returns void on successful deletion', async () => {
    const repo = makeRepo();
    repo.delete.mockResolvedValue(Either.right(undefined));

    const result = await new DeleteDepartmentUseCase(repo).execute(
      '00000000-0000-4000-8000-000000000001',
    );

    expect(result.isRight()).toBe(true);
  });

  it('returns NotFoundError when department does not exist', async () => {
    const repo = makeRepo();
    repo.delete.mockResolvedValue(
      Either.left(DataError.notFound('Department not found')),
    );

    const result = await new DeleteDepartmentUseCase(repo).execute('bad-id');

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });
});
