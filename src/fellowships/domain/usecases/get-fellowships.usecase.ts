import type {
  IFellowshipRepository,
  FellowshipFilters,
} from '../i-fellowship.repository';

export class GetFellowshipsUseCase {
  constructor(private readonly repo: IFellowshipRepository) {}
  execute(filters?: FellowshipFilters) {
    return this.repo.findAll(filters);
  }
}
