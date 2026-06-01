import type { IFellowshipRepository } from '../i-fellowship.repository';

export class DeleteFellowshipUseCase {
  constructor(private readonly repo: IFellowshipRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
