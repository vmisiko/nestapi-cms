import type { FellowshipZone } from '../../domain/fellowship-zone';

export class FellowshipZoneResponseDto {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(zone: FellowshipZone) {
    this.id = zone.id;
    this.name = zone.name;
    this.createdAt = zone.createdAt;
    this.updatedAt = zone.updatedAt;
  }
}
