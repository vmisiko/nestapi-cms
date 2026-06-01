import { Either } from '../../../../core/domain/either';
import { DataError } from '../../../../core/domain/data-error';
import { IFellowshipRepository } from '../../i-fellowship.repository';
import { makeFellowship, ID2 } from '../../../../test/fixtures';
import { generateSlug } from '../../../../core/domain/slug';
import { CreateFellowshipUseCase } from '../create-fellowship.usecase';
import { GetFellowshipsUseCase } from '../get-fellowships.usecase';
import { GetFellowshipByIdUseCase } from '../get-fellowship-by-id.usecase';
import { GetFellowshipBySlugUseCase } from '../get-fellowship-by-slug.usecase';
import { UpdateFellowshipUseCase } from '../update-fellowship.usecase';
import { DeleteFellowshipUseCase } from '../delete-fellowship.usecase';

const makeRepo = (): jest.Mocked<IFellowshipRepository> => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findBySlug: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

// ---------------------------------------------------------------------------
// GetFellowshipsUseCase
// ---------------------------------------------------------------------------
describe('GetFellowshipsUseCase', () => {
  it('returns all fellowships from repository', async () => {
    const repo = makeRepo();
    repo.findAll.mockResolvedValue(Either.right([makeFellowship()]));

    const result = await new GetFellowshipsUseCase(repo).execute();

    expect(result.isRight()).toBe(true);
    expect(result.getOrElse([])).toHaveLength(1);
  });

  it('applies filters when provided', async () => {
    const repo = makeRepo();
    repo.findAll.mockResolvedValue(Either.right([]));

    await new GetFellowshipsUseCase(repo).execute({ zoneId: ID2 });

    expect(repo.findAll).toHaveBeenCalledWith({ zoneId: ID2 });
  });

  it('propagates repository error', async () => {
    const repo = makeRepo();
    repo.findAll.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB error')),
    );

    const result = await new GetFellowshipsUseCase(repo).execute();

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
// GetFellowshipByIdUseCase
// ---------------------------------------------------------------------------
describe('GetFellowshipByIdUseCase', () => {
  it('returns fellowship when found', async () => {
    const repo = makeRepo();
    const fellowship = makeFellowship();
    repo.findById.mockResolvedValue(Either.right(fellowship));

    const result = await new GetFellowshipByIdUseCase(repo).execute(
      fellowship.id,
    );

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (f) => f.id,
      ),
    ).toBe(fellowship.id);
  });

  it('returns NotFoundError when not found', async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(
      Either.left(DataError.notFound('Fellowship not found')),
    );

    const result = await new GetFellowshipByIdUseCase(repo).execute('bad-id');

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
// GetFellowshipBySlugUseCase
// ---------------------------------------------------------------------------
describe('GetFellowshipBySlugUseCase', () => {
  it('returns fellowship when found by slug', async () => {
    const repo = makeRepo();
    const fellowship = makeFellowship();
    repo.findBySlug.mockResolvedValue(Either.right(fellowship));

    const result = await new GetFellowshipBySlugUseCase(repo).execute(
      'alpha-fellowship',
    );

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (f) => f.slug,
      ),
    ).toBe('alpha-fellowship');
  });

  it('returns NotFoundError when slug not found', async () => {
    const repo = makeRepo();
    repo.findBySlug.mockResolvedValue(
      Either.left(DataError.notFound('Fellowship not found')),
    );

    const result = await new GetFellowshipBySlugUseCase(repo).execute(
      'unknown-slug',
    );

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
// CreateFellowshipUseCase
// ---------------------------------------------------------------------------
describe('CreateFellowshipUseCase', () => {
  const params = {
    name: 'Alpha Fellowship',
    zoneId: ID2,
    meetingDay: 'Sunday',
    meetingTime: '10:00',
    location: 'Hall A',
  };

  it('creates fellowship and auto-generates slug', async () => {
    const repo = makeRepo();
    const expectedSlug = generateSlug(params.name);
    const fellowship = makeFellowship({ slug: expectedSlug });
    repo.findByName.mockResolvedValue(Either.right(null));
    repo.create.mockResolvedValue(Either.right(fellowship));

    const result = await new CreateFellowshipUseCase(repo).execute(params);

    expect(result.isRight()).toBe(true);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: expectedSlug }),
    );
  });

  it('returns ConflictError when name already exists', async () => {
    const repo = makeRepo();
    repo.findByName.mockResolvedValue(Either.right(makeFellowship()));

    const result = await new CreateFellowshipUseCase(repo).execute(params);

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('ConflictError');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('propagates repository error from findByName', async () => {
    const repo = makeRepo();
    repo.findByName.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB down')),
    );

    const result = await new CreateFellowshipUseCase(repo).execute(params);

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
    const repo = makeRepo();
    repo.findByName.mockResolvedValue(Either.right(null));
    repo.create.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'Failed to create')),
    );

    const result = await new CreateFellowshipUseCase(repo).execute(params);

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
// UpdateFellowshipUseCase
// ---------------------------------------------------------------------------
describe('UpdateFellowshipUseCase', () => {
  it('updates fellowship without changing slug when name not provided', async () => {
    const repo = makeRepo();
    const fellowship = makeFellowship({ location: 'Hall B' });
    repo.update.mockResolvedValue(Either.right(fellowship));

    const result = await new UpdateFellowshipUseCase(repo).execute(
      fellowship.id,
      { location: 'Hall B' },
    );

    expect(result.isRight()).toBe(true);
    expect(repo.update).toHaveBeenCalledWith(
      fellowship.id,
      expect.not.objectContaining({ slug: expect.anything() }),
    );
  });

  it('auto-generates slug when name is updated', async () => {
    const repo = makeRepo();
    const fellowship = makeFellowship({
      name: 'Beta Fellowship',
      slug: 'beta-fellowship',
    });
    repo.update.mockResolvedValue(Either.right(fellowship));

    await new UpdateFellowshipUseCase(repo).execute(fellowship.id, {
      name: 'Beta Fellowship',
    });

    expect(repo.update).toHaveBeenCalledWith(
      fellowship.id,
      expect.objectContaining({ slug: 'beta-fellowship' }),
    );
  });

  it('returns NotFoundError when fellowship does not exist', async () => {
    const repo = makeRepo();
    repo.update.mockResolvedValue(
      Either.left(DataError.notFound('Fellowship not found')),
    );

    const result = await new UpdateFellowshipUseCase(repo).execute('bad-id', {
      location: 'X',
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
// DeleteFellowshipUseCase
// ---------------------------------------------------------------------------
describe('DeleteFellowshipUseCase', () => {
  it('returns void on successful deletion', async () => {
    const repo = makeRepo();
    repo.delete.mockResolvedValue(Either.right(undefined));

    const result = await new DeleteFellowshipUseCase(repo).execute(
      '00000000-0000-4000-8000-000000000001',
    );

    expect(result.isRight()).toBe(true);
  });

  it('returns NotFoundError when fellowship does not exist', async () => {
    const repo = makeRepo();
    repo.delete.mockResolvedValue(
      Either.left(DataError.notFound('Fellowship not found')),
    );

    const result = await new DeleteFellowshipUseCase(repo).execute('bad-id');

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NotFoundError');
  });
});
