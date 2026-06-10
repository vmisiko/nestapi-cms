import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type {
  Member,
  AssignedDepartment,
  MemberStatus,
  MemberType,
  ActivityStatus,
  AgeGroup,
  ChurchRole,
  Gender,
} from './member';

export interface MemberFilters {
  status?: MemberStatus;
  fellowshipId?: string;
  hasFellowship?: boolean;
  departmentId?: string;
  memberType?: MemberType;
  activityStatus?: ActivityStatus;
  joinDateRange?: 'all' | 'recently' | 'week' | 'month';
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateMemberData {
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  status?: MemberStatus;
  fellowshipId?: string | null;
  memberType?: MemberType;
  activityStatus?: ActivityStatus;
  joinedAt?: string;
  avatarUrl?: string | null;
  gender?: Gender | null;
  ageGroup?: AgeGroup | null;
  churchRole?: ChurchRole | null;
  isOnline?: boolean;
  isInternational?: boolean;
}

export interface UpdateMemberData {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  email?: string | null;
  status?: MemberStatus;
  fellowshipId?: string | null;
  memberType?: MemberType;
  activityStatus?: ActivityStatus;
  avatarUrl?: string | null;
  gender?: Gender | null;
  ageGroup?: AgeGroup | null;
  churchRole?: ChurchRole | null;
  isOnline?: boolean;
  isInternational?: boolean;
}

export interface BulkImportRow {
  fullName: string;
  rowIndex?: number;
  phone?: string;
  email?: string;
  gender?: Gender;
  ageGroup?: AgeGroup;
  fellowshipId?: string;
  churchRole?: ChurchRole;
  isOnline?: boolean;
  isInternational?: boolean;
  wantsUpdates?: boolean;
}

export interface BulkImportResult {
  imported: number;
  duplicates: number;
  errors: { row: number; name: string; reason: string }[];
  members: Member[];
}

export interface BulkPreviewRow {
  rowIndex: number;
  fullName: string;
  phone: string;
  normalizedPhone: string | null;
  email: string;
  gender: string;
  ageGroup: string;
  area: string;
  churchRole: string;
  fellowshipId: string | null;
  fellowshipName: string | null;
  isOnline: boolean;
  isInternational: boolean;
  status: 'ready' | 'duplicate_in_file' | 'duplicate_in_db' | 'invalid';
  issues: string[];
}

export interface BulkPreviewResponse {
  rows: BulkPreviewRow[];
}

export interface IMemberRepository {
  findAll(
    filters?: MemberFilters,
  ): Promise<Either<DataError, { data: Member[]; total: number }>>;
  findById(id: string): Promise<Either<DataError, Member>>;
  create(data: CreateMemberData): Promise<Either<DataError, Member>>;
  update(
    id: string,
    data: UpdateMemberData,
  ): Promise<Either<DataError, Member>>;
  delete(id: string): Promise<Either<DataError, void>>;
  findDepartments(
    memberId: string,
  ): Promise<Either<DataError, AssignedDepartment[]>>;
  assignDepartment(
    memberId: string,
    departmentId: string,
  ): Promise<Either<DataError, void>>;
  removeDepartment(
    memberId: string,
    departmentId: string,
  ): Promise<Either<DataError, void>>;
  bulkImport(
    rows: BulkImportRow[],
  ): Promise<Either<DataError, BulkImportResult>>;
  previewBulkImport(
    csvBuffer: Buffer,
  ): Promise<Either<DataError, BulkPreviewResponse>>;
}
