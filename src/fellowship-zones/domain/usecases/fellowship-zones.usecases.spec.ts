import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import { IFellowshipZoneRepository } from '../i-fellowship-zone.repository';
import { makeZone } from '../../../test/fixtures';
import { CreateFellowshipZoneUseCase } from './create-fellowship-zone.usecase';
import { GetFellowshipZonesUseCase } from './get-fellowship-zones.usecase';
import { GetFellowshipZoneByIdUseCase } from './get-fellowship-zone-by-id.usecase';
import { UpdateFellowshipZoneUseCase } from './update-fellowship-zone.usecase';
import { DeleteFellowshipZoneUseCase } from './delete-fellowship-zone.usecase';

const makeRepo = (): jest.Mocked<IFellowshipZoneRepository> => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
});

// ---------------------------------------------------------------------------
// GetFellowshipZonesUseCase
// ---------------------------------------------------------------------------
describe('GetFellowshipZonesUseCase', () => {
  let repo: jest.Mocked<IFellowshipZoneRepository>;

  beforeEach(() => {
    repo = makeRepo();
  });

  it('returns all zones from repository', async () => {
    const zones = [makeZone()];
    repo.findAll.mockResolvedValue(Either.right(zones));

    const result = await new GetFellowshipZonesUseCase(repo).execute();

    expect(result.isRight()).toBe(true);
    expect(result.getOrElse([])).toHaveLength(1);
  });

  it('propagates repository error', async () => {
    repo.findAll.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB error')),
    );

    const result = await new GetFellowshipZonesUseCase(repo).execute();

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
// GetFellowshipZoneByIdUseCase
// ---------------------------------------------------------------------------
describe('GetFellowshipZoneByIdUseCase', () => {
  let repo: jest.Mocked<IFellowshipZoneRepository>;

  beforeEach(() => {
    repo = makeRepo();
  });

  it('returns zone when found', async () => {
    const zone = makeZone();
    repo.findById.mockResolvedValue(Either.right(zone));

    const result = await new GetFellowshipZoneByIdUseCase(repo).execute(
      zone.id,
    );

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (z) => z.id,
      ),
    ).toBe(zone.id);
  });

  it('returns NotFoundError when zone does not exist', async () => {
    repo.findById.mockResolvedValue(
      Either.left(DataError.notFound('Zone not found')),
    );

    const result = await new GetFellowshipZoneByIdUseCase(repo).execute(
      'bad-id',
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
// CreateFellowshipZoneUseCase
// ---------------------------------------------------------------------------
describe('CreateFellowshipZoneUseCase', () => {
  let repo: jest.Mocked<IFellowshipZoneRepository>;

  beforeEach(() => {
    repo = makeRepo();
  });

  it('creates zone when name is not taken', async () => {
    const zone = makeZone();
    repo.findByName.mockResolvedValue(Either.right(null));
    repo.create.mockResolvedValue(Either.right(zone));

    const result = await new CreateFellowshipZoneUseCase(repo).execute({
      name: 'North Zone',
    });

    expect(result.isRight()).toBe(true);
    expect(repo.create).toHaveBeenCalledWith({ name: 'North Zone' });
  });

  it('returns ConflictError when name already exists', async () => {
    repo.findByName.mockResolvedValue(Either.right(makeZone()));

    const result = await new CreateFellowshipZoneUseCase(repo).execute({
      name: 'North Zone',
    });

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
    repo.findByName.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB down')),
    );

    const result = await new CreateFellowshipZoneUseCase(repo).execute({
      name: 'North Zone',
    });

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
    repo.findByName.mockResolvedValue(Either.right(null));
    repo.create.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'Failed to create')),
    );

    const result = await new CreateFellowshipZoneUseCase(repo).execute({
      name: 'North Zone',
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
// UpdateFellowshipZoneUseCase
// ---------------------------------------------------------------------------
describe('UpdateFellowshipZoneUseCase', () => {
  let repo: jest.Mocked<IFellowshipZoneRepository>;

  beforeEach(() => {
    repo = makeRepo();
  });

  it('delegates to repo.update and returns updated zone', async () => {
    const zone = makeZone({ name: 'South Zone' });
    repo.update.mockResolvedValue(Either.right(zone));

    const result = await new UpdateFellowshipZoneUseCase(repo).execute(
      zone.id,
      { name: 'South Zone' },
    );

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (z) => z.name,
      ),
    ).toBe('South Zone');
  });

  it('returns NotFoundError when zone does not exist', async () => {
    repo.update.mockResolvedValue(
      Either.left(DataError.notFound('Zone not found')),
    );

    const result = await new UpdateFellowshipZoneUseCase(repo).execute(
      'bad-id',
      { name: 'X' },
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
// DeleteFellowshipZoneUseCase
// ---------------------------------------------------------------------------
describe('DeleteFellowshipZoneUseCase', () => {
  let repo: jest.Mocked<IFellowshipZoneRepository>;

  beforeEach(() => {
    repo = makeRepo();
  });

  it('returns void on successful deletion', async () => {
    repo.delete.mockResolvedValue(Either.right(undefined));

    const result = await new DeleteFellowshipZoneUseCase(repo).execute(
      '00000000-0000-4000-8000-000000000001',
    );

    expect(result.isRight()).toBe(true);
  });

  it('returns NotFoundError when zone does not exist', async () => {
    repo.delete.mockResolvedValue(
      Either.left(DataError.notFound('Zone not found')),
    );

    const result = await new DeleteFellowshipZoneUseCase(repo).execute(
      'bad-id',
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
