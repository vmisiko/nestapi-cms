import type {
  IFellowshipZoneRepository,
  UpdateFellowshipZoneData,
} from '../i-fellowship-zone.repository';

export class UpdateFellowshipZoneUseCase {
  constructor(private readonly repo: IFellowshipZoneRepository) {}
  execute(id: string, data: UpdateFellowshipZoneData) {
    return this.repo.update(id, data);
  }
}
