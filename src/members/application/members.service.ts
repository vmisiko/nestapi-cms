import { Injectable } from '@nestjs/common';
import { MemberRepository } from '../infrastructure/member.repository';
import { GetMembersUseCase } from '../domain/usecases/get-members.usecase';
import { GetMemberByIdUseCase } from '../domain/usecases/get-member-by-id.usecase';
import { CreateMemberUseCase } from '../domain/usecases/create-member.usecase';
import { UpdateMemberUseCase } from '../domain/usecases/update-member.usecase';
import { DeleteMemberUseCase } from '../domain/usecases/delete-member.usecase';
import { AssignMemberToDepartmentUseCase } from '../domain/usecases/assign-member-to-department.usecase';
import { RemoveMemberFromDepartmentUseCase } from '../domain/usecases/remove-member-from-department.usecase';
import { BulkImportMembersUseCase } from '../domain/usecases/bulk-import-members.usecase';
import { PreviewBulkImportUseCase } from '../domain/usecases/preview-bulk-import.usecase';
import type { CreateMemberDto } from '../presentation/dto/create-member.dto';
import type { UpdateMemberDto } from '../presentation/dto/update-member.dto';
import type { MemberFiltersDto } from '../presentation/dto/member-filters.dto';
import type { BulkImportMembersDto } from '../presentation/dto/bulk-import-members.dto';
import type { Member, AssignedDepartment } from '../domain/member';
import type {
  MemberFilters,
  BulkImportResult,
  BulkPreviewResponse,
} from '../domain/i-member.repository';
import { toHttpException } from '../../core/application/http-exception.util';

@Injectable()
export class MembersService {
  private readonly getAll: GetMembersUseCase;
  private readonly getById: GetMemberByIdUseCase;
  private readonly createUseCase: CreateMemberUseCase;
  private readonly updateUseCase: UpdateMemberUseCase;
  private readonly deleteUseCase: DeleteMemberUseCase;
  private readonly assignDept: AssignMemberToDepartmentUseCase;
  private readonly removeDept: RemoveMemberFromDepartmentUseCase;
  private readonly bulkImportUseCase: BulkImportMembersUseCase;
  private readonly previewBulkImportUseCase: PreviewBulkImportUseCase;

  constructor(readonly repo: MemberRepository) {
    this.getAll = new GetMembersUseCase(repo);
    this.getById = new GetMemberByIdUseCase(repo);
    this.createUseCase = new CreateMemberUseCase(repo);
    this.updateUseCase = new UpdateMemberUseCase(repo);
    this.deleteUseCase = new DeleteMemberUseCase(repo);
    this.assignDept = new AssignMemberToDepartmentUseCase(repo);
    this.removeDept = new RemoveMemberFromDepartmentUseCase(repo);
    this.bulkImportUseCase = new BulkImportMembersUseCase(repo);
    this.previewBulkImportUseCase = new PreviewBulkImportUseCase(repo);
  }

  async findAll(
    query: MemberFiltersDto,
  ): Promise<{ data: Member[]; total: number }> {
    const filters: MemberFilters = { ...query };
    const result = await this.getAll.execute(filters);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (r) => r,
    );
  }

  async findById(id: string): Promise<Member> {
    const result = await this.getById.execute(id);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (m) => m,
    );
  }

  async create(dto: CreateMemberDto): Promise<Member> {
    const result = await this.createUseCase.execute(dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (m) => m,
    );
  }

  async update(id: string, dto: UpdateMemberDto): Promise<Member> {
    const result = await this.updateUseCase.execute(id, dto);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (m) => m,
    );
  }

  async delete(id: string): Promise<void> {
    const result = await this.deleteUseCase.execute(id);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }

  async findDepartments(memberId: string): Promise<AssignedDepartment[]> {
    const result = await this.repo.findDepartments(memberId);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (d) => d,
    );
  }

  async assignDepartment(
    memberId: string,
    departmentId: string,
  ): Promise<void> {
    const result = await this.assignDept.execute(memberId, departmentId);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }

  async removeDepartment(
    memberId: string,
    departmentId: string,
  ): Promise<void> {
    const result = await this.removeDept.execute(memberId, departmentId);
    result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      () => undefined,
    );
  }

  async bulkImport(dto: BulkImportMembersDto): Promise<BulkImportResult> {
    const result = await this.bulkImportUseCase.execute(dto.rows);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (r) => r,
    );
  }

  async previewBulkImport(csvBuffer: Buffer): Promise<BulkPreviewResponse> {
    const result = await this.previewBulkImportUseCase.execute(csvBuffer);
    return result.fold(
      (err) => {
        throw toHttpException(err.kind, err.message);
      },
      (preview) => preview,
    );
  }
}
