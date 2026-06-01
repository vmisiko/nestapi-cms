import type { IFellowshipZoneRepository } from '../i-fellowship-zone.repository';

export class GetFellowshipZoneByIdUseCase {
  constructor(private readonly repo: IFellowshipZoneRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}
