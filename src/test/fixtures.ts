import { FellowshipZone } from '../fellowship-zones/domain/fellowship-zone';
import { Fellowship, ActivityStatus } from '../fellowships/domain/fellowship';
import { Department } from '../departments/domain/department';
import {
  Member,
  AssignedDepartment,
  MemberStatus,
  MemberType,
} from '../members/domain/member';

const DATE = new Date('2026-01-01T00:00:00Z');
const ID1 = '00000000-0000-4000-8000-000000000001';
const ID2 = '00000000-0000-4000-8000-000000000002';
const ID3 = '00000000-0000-4000-8000-000000000003';

export const makeZone = (
  overrides: Partial<FellowshipZone> = {},
): FellowshipZone => ({
  id: ID1,
  name: 'North Zone',
  createdAt: DATE,
  updatedAt: DATE,
  ...overrides,
});

export const makeFellowship = (
  overrides: Partial<Fellowship> = {},
): Fellowship => ({
  id: ID1,
  name: 'Alpha Fellowship',
  slug: 'alpha-fellowship',
  zoneId: ID2,
  leaderId: null,
  meetingDay: 'Sunday',
  meetingTime: '10:00',
  location: 'Hall A',
  status: ActivityStatus.ACTIVE,
  description: null,
  memberCount: 0,
  createdAt: DATE,
  updatedAt: DATE,
  ...overrides,
});

export const makeDepartment = (
  overrides: Partial<Department> = {},
): Department => ({
  id: ID1,
  name: 'Worship Department',
  headId: null,
  memberTarget: 20,
  annualBudget: 5000,
  budgetSpent: 0,
  description: null,
  memberCount: 0,
  createdAt: DATE,
  updatedAt: DATE,
  ...overrides,
});

export const makeMember = (overrides: Partial<Member> = {}): Member => ({
  id: ID1,
  firstName: 'John',
  lastName: 'Doe',
  phone: null,
  email: 'john.doe@citymega.org',
  status: MemberStatus.MEMBER,
  fellowshipId: null,
  memberType: MemberType.ADULT,
  activityStatus: ActivityStatus.ACTIVE,
  joinedAt: '2026-01-01',
  avatarUrl: null,
  gender: null,
  ageGroup: null,
  churchRole: null,
  isOnline: false,
  isInternational: false,
  createdAt: DATE,
  updatedAt: DATE,
  ...overrides,
});

export const makeAssignedDepartment = (
  overrides: Partial<AssignedDepartment> = {},
): AssignedDepartment => ({
  id: ID2,
  name: 'Worship Department',
  ...overrides,
});

export { ID1, ID2, ID3 };
