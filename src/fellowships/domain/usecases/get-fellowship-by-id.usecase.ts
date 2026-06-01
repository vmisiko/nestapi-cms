import type { IFellowshipRepository } from '../i-fellowship.repository';

export class GetFellowshipByIdUseCase {
  constructor(private readonly repo: IFellowshipRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}
