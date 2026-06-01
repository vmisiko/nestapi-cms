import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { Fellowship, ActivityStatus } from './fellowship';

export interface FellowshipFilters {
  zoneId?: string;
  status?: ActivityStatus;
}

export interface CreateFellowshipData {
  name: string;
  slug: string;
  zoneId: string;
  leaderId?: string | null;
  meetingDay: string;
  meetingTime: string;
  location: string;
  status?: ActivityStatus;
  description?: string | null;
}

export interface UpdateFellowshipData {
  name?: string;
  slug?: string;
  zoneId?: string;
  leaderId?: string | null;
  meetingDay?: string;
  meetingTime?: string;
  location?: string;
  status?: ActivityStatus;
  description?: string | null;
}

export interface IFellowshipRepository {
  findAll(
    filters?: FellowshipFilters,
  ): Promise<Either<DataError, Fellowship[]>>;
  findById(id: string): Promise<Either<DataError, Fellowship>>;
  findBySlug(slug: string): Promise<Either<DataError, Fellowship>>;
  findByName(name: string): Promise<Either<DataError, Fellowship | null>>;
  create(data: CreateFellowshipData): Promise<Either<DataError, Fellowship>>;
  update(
    id: string,
    data: UpdateFellowshipData,
  ): Promise<Either<DataError, Fellowship>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
