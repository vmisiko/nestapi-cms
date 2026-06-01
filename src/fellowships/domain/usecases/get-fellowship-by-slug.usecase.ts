import type { IFellowshipRepository } from '../i-fellowship.repository';

export class GetFellowshipBySlugUseCase {
  constructor(private readonly repo: IFellowshipRepository) {}
  execute(slug: string) {
    return this.repo.findBySlug(slug);
  }
}
