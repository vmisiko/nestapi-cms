import type { IFellowshipZoneRepository } from '../i-fellowship-zone.repository';

export class GetFellowshipZonesUseCase {
  constructor(private readonly repo: IFellowshipZoneRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
