export interface MilestoneType {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberMilestone {
  id: string;
  memberId: string;
  milestoneTypeId: string;
  achievedAt: string;
  notes: string | null;
  createdAt: Date;
}
