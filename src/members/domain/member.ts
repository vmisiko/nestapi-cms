import { ActivityStatus } from '../../core/domain/enums';

export { ActivityStatus };

export enum MemberStatus {
  GUEST = 'guest',
  MEMBER = 'member',
  LEADER = 'leader',
}

export enum MemberType {
  ADULT = 'adult',
  CHILD = 'child',
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
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
}

export interface AssignedDepartment {
  id: string;
  name: string;
}
