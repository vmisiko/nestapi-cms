import { Either } from '../../../../core/domain/either';
import { DataError } from '../../../../core/domain/data-error';
import { IMemberRepository, BulkImportResult } from '../../i-member.repository';
import { makeMember, ID1, ID2 } from '../../../../test/fixtures';
import { CreateMemberUseCase } from '../create-member.usecase';
import { GetMembersUseCase } from '../get-members.usecase';
import { GetMemberByIdUseCase } from '../get-member-by-id.usecase';
import { UpdateMemberUseCase } from '../update-member.usecase';
import { DeleteMemberUseCase } from '../delete-member.usecase';
import { AssignMemberToDepartmentUseCase } from '../assign-member-to-department.usecase';
import { RemoveMemberFromDepartmentUseCase } from '../remove-member-from-department.usecase';
import { BulkImportMembersUseCase } from '../bulk-import-members.usecase';
import { MemberStatus, ChurchRole } from '../../member';

const makeRepo = (): jest.Mocked<IMemberRepository> => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findDepartments: jest.fn(),
  assignDepartment: jest.fn(),
  removeDepartment: jest.fn(),
  bulkImport: jest.fn(),
});

// ---------------------------------------------------------------------------
// GetMembersUseCase
// ---------------------------------------------------------------------------
describe('GetMembersUseCase', () => {
  it('returns paginated members from repository', async () => {
    const repo = makeRepo();
    repo.findAll.mockResolvedValue(
      Either.right({ data: [makeMember()], total: 1 }),
    );

    const result = await new GetMembersUseCase(repo).execute();

    expect(result.isRight()).toBe(true);
    const value = result.fold(
      () => null,
      (r) => r,
    );
    expect(value?.data).toHaveLength(1);
    expect(value?.total).toBe(1);
  });

  it('applies filters when provided', async () => {
    const repo = makeRepo();
    repo.findAll.mockResolvedValue(Either.right({ data: [], total: 0 }));

    await new GetMembersUseCase(repo).execute({
      status: MemberStatus.MEMBER,
      page: 2,
      limit: 10,
    });

    expect(repo.findAll).toHaveBeenCalledWith({
      status: MemberStatus.MEMBER,
      page: 2,
      limit: 10,
    });
  });

  it('propagates repository error', async () => {
    const repo = makeRepo();
    repo.findAll.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'DB error')),
    );

    const result = await new GetMembersUseCase(repo).execute();

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
// GetMemberByIdUseCase
// ---------------------------------------------------------------------------
describe('GetMemberByIdUseCase', () => {
  it('returns member when found', async () => {
    const repo = makeRepo();
    const member = makeMember();
    repo.findById.mockResolvedValue(Either.right(member));

    const result = await new GetMemberByIdUseCase(repo).execute(member.id);

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (m) => m.id,
      ),
    ).toBe(member.id);
  });

  it('returns NotFoundError when not found', async () => {
    const repo = makeRepo();
    repo.findById.mockResolvedValue(
      Either.left(DataError.notFound('Member not found')),
    );

    const result = await new GetMemberByIdUseCase(repo).execute('bad-id');

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
// CreateMemberUseCase
// ---------------------------------------------------------------------------
describe('CreateMemberUseCase', () => {
  it('creates member via repository', async () => {
    const repo = makeRepo();
    const member = makeMember();
    repo.create.mockResolvedValue(Either.right(member));

    const result = await new CreateMemberUseCase(repo).execute({
      firstName: 'John',
      lastName: 'Doe',
    });

    expect(result.isRight()).toBe(true);
    expect(repo.create).toHaveBeenCalledWith({
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  it('propagates repository error', async () => {
    const repo = makeRepo();
    repo.create.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'Failed to create')),
    );

    const result = await new CreateMemberUseCase(repo).execute({
      firstName: 'John',
      lastName: 'Doe',
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
// UpdateMemberUseCase
// ---------------------------------------------------------------------------
describe('UpdateMemberUseCase', () => {
  it('delegates to repo.update', async () => {
    const repo = makeRepo();
    const member = makeMember({ status: MemberStatus.LEADER });
    repo.update.mockResolvedValue(Either.right(member));

    const result = await new UpdateMemberUseCase(repo).execute(ID1, {
      status: MemberStatus.LEADER,
    });

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (m) => m.status,
      ),
    ).toBe(MemberStatus.LEADER);
  });

  it('returns NotFoundError when member does not exist', async () => {
    const repo = makeRepo();
    repo.update.mockResolvedValue(
      Either.left(DataError.notFound('Member not found')),
    );

    const result = await new UpdateMemberUseCase(repo).execute('bad-id', {});

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
// DeleteMemberUseCase
// ---------------------------------------------------------------------------
describe('DeleteMemberUseCase', () => {
  it('returns void on successful deletion', async () => {
    const repo = makeRepo();
    repo.delete.mockResolvedValue(Either.right(undefined));

    const result = await new DeleteMemberUseCase(repo).execute(ID1);

    expect(result.isRight()).toBe(true);
  });

  it('returns NotFoundError when member does not exist', async () => {
    const repo = makeRepo();
    repo.delete.mockResolvedValue(
      Either.left(DataError.notFound('Member not found')),
    );

    const result = await new DeleteMemberUseCase(repo).execute('bad-id');

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
// AssignMemberToDepartmentUseCase
// ---------------------------------------------------------------------------
describe('AssignMemberToDepartmentUseCase', () => {
  it('assigns member to department', async () => {
    const repo = makeRepo();
    repo.assignDepartment.mockResolvedValue(Either.right(undefined));

    const result = await new AssignMemberToDepartmentUseCase(repo).execute(
      ID1,
      ID2,
    );

    expect(result.isRight()).toBe(true);
    expect(repo.assignDepartment).toHaveBeenCalledWith(ID1, ID2);
  });

  it('returns ConflictError when already assigned', async () => {
    const repo = makeRepo();
    repo.assignDepartment.mockResolvedValue(
      Either.left(DataError.conflict('Member is already in this department')),
    );

    const result = await new AssignMemberToDepartmentUseCase(repo).execute(
      ID1,
      ID2,
    );

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('ConflictError');
  });
});

// ---------------------------------------------------------------------------
// BulkImportMembersUseCase
// ---------------------------------------------------------------------------
describe('BulkImportMembersUseCase', () => {
  const emptyResult: BulkImportResult = {
    imported: 0,
    duplicates: 0,
    errors: [],
    members: [],
  };

  it('delegates rows to repo.bulkImport and returns the result', async () => {
    const repo = makeRepo();
    const importResult: BulkImportResult = {
      imported: 2,
      duplicates: 1,
      errors: [
        {
          row: 3,
          name: 'Duplicate Dan',
          reason: 'Phone number already registered',
        },
      ],
      members: [makeMember(), makeMember({ id: ID2, firstName: 'Grace' })],
    };
    repo.bulkImport.mockResolvedValue(Either.right(importResult));

    const rows = [
      { fullName: 'John Doe', phone: '0712345678' },
      { fullName: 'Grace Njeri', phone: '0798765432' },
      { fullName: 'Duplicate Dan', phone: '0712345678' },
    ];

    const result = await new BulkImportMembersUseCase(repo).execute(rows);

    expect(result.isRight()).toBe(true);
    expect(repo.bulkImport).toHaveBeenCalledWith(rows);
    expect(
      result.fold(
        () => null,
        (r) => r.imported,
      ),
    ).toBe(2);
    expect(
      result.fold(
        () => null,
        (r) => r.duplicates,
      ),
    ).toBe(1);
    expect(
      result.fold(
        () => null,
        (r) => r.errors,
      ),
    ).toHaveLength(1);
  });

  it('returns the repository result unchanged for empty rows', async () => {
    const repo = makeRepo();
    repo.bulkImport.mockResolvedValue(Either.right(emptyResult));

    const result = await new BulkImportMembersUseCase(repo).execute([]);

    expect(result.isRight()).toBe(true);
    expect(
      result.fold(
        () => null,
        (r) => r.imported,
      ),
    ).toBe(0);
    expect(
      result.fold(
        () => null,
        (r) => r.members,
      ),
    ).toHaveLength(0);
    expect(repo.bulkImport).toHaveBeenCalledWith([]);
  });

  it('propagates repository errors', async () => {
    const repo = makeRepo();
    repo.bulkImport.mockResolvedValue(
      Either.left(new DataError('NetworkError', 'Bulk import failed')),
    );

    const result = await new BulkImportMembersUseCase(repo).execute([
      { fullName: 'John Doe', phone: '0712345678' },
    ]);

    expect(result.isLeft()).toBe(true);
    expect(
      result.fold(
        (e) => e.kind,
        () => null,
      ),
    ).toBe('NetworkError');
  });

  it('passes church role through to repo', async () => {
    const repo = makeRepo();
    repo.bulkImport.mockResolvedValue(Either.right(emptyResult));

    const rows = [
      {
        fullName: 'Pastor Paul',
        phone: '0700000001',
        churchRole: ChurchRole.PASTOR,
      },
      {
        fullName: 'Elder Mary',
        phone: '0700000002',
        churchRole: ChurchRole.ELDER,
      },
    ];

    await new BulkImportMembersUseCase(repo).execute(rows);

    expect(repo.bulkImport).toHaveBeenCalledWith(rows);
  });

  it('passes isOnline flag through to repo', async () => {
    const repo = makeRepo();
    repo.bulkImport.mockResolvedValue(Either.right(emptyResult));

    const rows = [
      {
        fullName: 'Online Member',
        churchRole: ChurchRole.ONLINE_MEMBER,
        isOnline: true,
        isInternational: true,
      },
    ];

    await new BulkImportMembersUseCase(repo).execute(rows);

    expect(repo.bulkImport).toHaveBeenCalledWith(rows);
  });
});

// ---------------------------------------------------------------------------
// RemoveMemberFromDepartmentUseCase
// ---------------------------------------------------------------------------
describe('RemoveMemberFromDepartmentUseCase', () => {
  it('removes member from department', async () => {
    const repo = makeRepo();
    repo.removeDepartment.mockResolvedValue(Either.right(undefined));

    const result = await new RemoveMemberFromDepartmentUseCase(repo).execute(
      ID1,
      ID2,
    );

    expect(result.isRight()).toBe(true);
    expect(repo.removeDepartment).toHaveBeenCalledWith(ID1, ID2);
  });

  it('returns NotFoundError when assignment does not exist', async () => {
    const repo = makeRepo();
    repo.removeDepartment.mockResolvedValue(
      Either.left(DataError.notFound('Member is not in this department')),
    );

    const result = await new RemoveMemberFromDepartmentUseCase(repo).execute(
      ID1,
      ID2,
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
