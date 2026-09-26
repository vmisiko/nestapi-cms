import { ApiProperty } from '@nestjs/swagger';
import type { MilestoneType, MemberMilestone } from '../../domain/milestone-type';

export class MilestoneTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(type: MilestoneType) {
    this.id = type.id;
    this.name = type.name;
    this.description = type.description;
    this.createdAt = type.createdAt;
    this.updatedAt = type.updatedAt;
  }
}

export class MemberMilestoneResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  memberId: string;

  @ApiProperty()
  milestoneTypeId: string;

  @ApiProperty()
  achievedAt: string;

  @ApiProperty({ nullable: true })
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  constructor(milestone: MemberMilestone) {
    this.id = milestone.id;
    this.memberId = milestone.memberId;
    this.milestoneTypeId = milestone.milestoneTypeId;
    this.achievedAt = milestone.achievedAt;
    this.notes = milestone.notes;
    this.createdAt = milestone.createdAt;
  }
}
