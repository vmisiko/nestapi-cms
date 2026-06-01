import type { Either } from '../../core/domain/either';
import type { DataError } from '../../core/domain/data-error';
import type { FellowshipZone } from './fellowship-zone';

export interface CreateFellowshipZoneData {
  name: string;
}

export interface UpdateFellowshipZoneData {
  name?: string;
}

export interface IFellowshipZoneRepository {
  findAll(): Promise<Either<DataError, FellowshipZone[]>>;
  findById(id: string): Promise<Either<DataError, FellowshipZone>>;
  findByName(name: string): Promise<Either<DataError, FellowshipZone | null>>;
  create(
    data: CreateFellowshipZoneData,
  ): Promise<Either<DataError, FellowshipZone>>;
  update(
    id: string,
    data: UpdateFellowshipZoneData,
  ): Promise<Either<DataError, FellowshipZone>>;
  delete(id: string): Promise<Either<DataError, void>>;
}
