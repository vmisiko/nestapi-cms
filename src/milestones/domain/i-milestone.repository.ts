import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { MilestoneType, MemberMilestone } from './milestone-type';

export interface IMilestoneTypeRepository {
  findAll(): Promise<Either<DataError, MilestoneType[]>>;
  findById(id: string): Promise<Either<DataError, MilestoneType>>;
  create(data: {
    name: string;
    description?: string | null;
  }): Promise<Either<DataError, MilestoneType>>;
  update(
    id: string,
    data: { name?: string; description?: string | null },
  ): Promise<Either<DataError, MilestoneType>>;
  delete(id: string): Promise<Either<DataError, void>>;
}

export interface IMemberMilestoneRepository {
  findByMember(
    memberId: string,
  ): Promise<Either<DataError, MemberMilestone[]>>;
  create(data: {
    memberId: string;
    milestoneTypeId: string;
    achievedAt?: string;
    notes?: string | null;
  }): Promise<Either<DataError, MemberMilestone>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
