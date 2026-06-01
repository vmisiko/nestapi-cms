import type { IFellowshipZoneRepository } from '../i-fellowship-zone.repository';
import type { FellowshipZone } from '../fellowship-zone';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';

export class CreateFellowshipZoneUseCase {
  constructor(private readonly repo: IFellowshipZoneRepository) {}

  async execute(data: {
    name: string;
  }): Promise<Either<DataError, FellowshipZone>> {
    const existing = await this.repo.findByName(data.name);
    if (existing.isLeft())
      return existing as unknown as Either<DataError, FellowshipZone>;
    if (
      existing.fold<FellowshipZone | null>(
        () => null,
        (z) => z,
      ) !== null
    ) {
      return Either.left(
        DataError.conflict(`Zone "${data.name}" already exists`),
      );
    }
    return this.repo.create(data);
  }
}
