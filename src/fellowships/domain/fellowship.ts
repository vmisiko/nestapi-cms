import { ActivityStatus } from '../../core/domain/enums';

export { ActivityStatus };

export interface Fellowship {
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
}
