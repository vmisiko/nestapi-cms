import type { Member } from '../../domain/member';
import { MemberStatus, MemberType, ActivityStatus } from '../../domain/member';

export class MemberResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  initials: string;
  phone: string | null;
  email: string | null;
  status: MemberStatus;
  fellowshipId: string | null;
  memberType: MemberType;
  activityStatus: ActivityStatus;
  joinedAt: string;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(m: Member) {
    Object.assign(this, m);
    this.name = `${m.firstName} ${m.lastName}`;
    this.initials = `${m.firstName[0]}${m.lastName[0]}`.toUpperCase();
  }
}
