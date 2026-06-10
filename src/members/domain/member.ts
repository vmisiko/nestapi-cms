import {
  ActivityStatus,
  AgeGroup,
  ChurchRole,
  Gender,
} from '../../core/domain/enums';

export { ActivityStatus, AgeGroup, ChurchRole, Gender };

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
  gender: Gender | null;
  ageGroup: AgeGroup | null;
  churchRole: ChurchRole | null;
  isOnline: boolean;
  isInternational: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssignedDepartment {
  id: string;
  name: string;
}
