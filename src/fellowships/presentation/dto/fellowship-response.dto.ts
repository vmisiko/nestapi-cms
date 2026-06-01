import type { Fellowship } from '../../domain/fellowship';
import { ActivityStatus } from '../../../core/domain/enums';

export class FellowshipResponseDto {
  id: string;
  name: string;
  slug: string;
  zoneId: string;
  leaderId: string | null;
  meetingDay: string;
  meetingTime: string;
  location: string;
  status: ActivityStatus;
  description: string | null;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(f: Fellowship) {
    Object.assign(this, f);
  }
}
