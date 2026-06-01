import { ApiProperty } from '@nestjs/swagger';
import type { Fellowship } from '../../domain/fellowship';
import { ActivityStatus } from '../../../core/domain/enums';

export class FellowshipResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  zoneId: string;

  @ApiProperty({ nullable: true })
  leaderId: string | null;

  @ApiProperty()
  meetingDay: string;

  @ApiProperty()
  meetingTime: string;

  @ApiProperty()
  location: string;

  @ApiProperty({ enum: ActivityStatus })
  status: ActivityStatus;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  memberCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(f: Fellowship) {
    Object.assign(this, f);
  }
}
