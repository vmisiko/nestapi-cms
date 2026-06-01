import type { IFellowshipZoneRepository } from '../i-fellowship-zone.repository';

export class DeleteFellowshipZoneUseCase {
  constructor(private readonly repo: IFellowshipZoneRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
