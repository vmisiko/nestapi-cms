import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type {
  Member,
  AssignedDepartment,
  MemberStatus,
  MemberType,
  ActivityStatus,
} from './member';

export interface MemberFilters {
  status?: MemberStatus;
  fellowshipId?: string;
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
}
