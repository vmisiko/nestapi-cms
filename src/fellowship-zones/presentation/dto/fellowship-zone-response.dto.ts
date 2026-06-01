import { ApiProperty } from '@nestjs/swagger';
import type { FellowshipZone } from '../../domain/fellowship-zone';

export class FellowshipZoneResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(zone: FellowshipZone) {
    this.id = zone.id;
    this.name = zone.name;
    this.createdAt = zone.createdAt;
    this.updatedAt = zone.updatedAt;
  }
}
