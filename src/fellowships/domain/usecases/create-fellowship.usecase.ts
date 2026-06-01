import type { IFellowshipRepository } from '../i-fellowship.repository';
import type { Fellowship } from '../fellowship';
import { Either } from '../../../core/domain/either';
import { DataError } from '../../../core/domain/data-error';
import { generateSlug } from '../../../core/domain/slug';

export interface CreateFellowshipParams {
  name: string;
  zoneId: string;
  leaderId?: string | null;
  meetingDay: string;
  meetingTime: string;
  location: string;
  description?: string | null;
}

export class CreateFellowshipUseCase {
  constructor(private readonly repo: IFellowshipRepository) {}

  async execute(
    params: CreateFellowshipParams,
  ): Promise<Either<DataError, Fellowship>> {
    const existing = await this.repo.findByName(params.name);
    if (existing.isLeft())
      return existing as unknown as Either<DataError, Fellowship>;
    if (
      existing.fold<Fellowship | null>(
        () => null,
        (f) => f,
      ) !== null
    ) {
      return Either.left(
        DataError.conflict(`Fellowship "${params.name}" already exists`),
      );
    }
    return this.repo.create({ ...params, slug: generateSlug(params.name) });
  }
}
