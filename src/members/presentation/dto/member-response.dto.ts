import { ApiProperty } from '@nestjs/swagger';
import type { Member } from '../../domain/member';
import { MemberStatus, MemberType, ActivityStatus } from '../../domain/member';

export class MemberResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  initials: string;

  @ApiProperty({ nullable: true })
  phone: string | null;

  @ApiProperty({ nullable: true })
  email: string | null;

  @ApiProperty({ enum: MemberStatus })
  status: MemberStatus;

  @ApiProperty({ nullable: true })
  fellowshipId: string | null;

  @ApiProperty({ enum: MemberType })
  memberType: MemberType;

  @ApiProperty({ enum: ActivityStatus })
  activityStatus: ActivityStatus;

  @ApiProperty()
  joinedAt: string;

  @ApiProperty({ nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ nullable: true })
  gender: string | null;

  @ApiProperty({ nullable: true })
  ageGroup: string | null;

  @ApiProperty({ nullable: true })
  churchRole: string | null;

  @ApiProperty()
  isOnline: boolean;

  @ApiProperty()
  isInternational: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(m: Member) {
    Object.assign(this, m);
    this.name = `${m.firstName} ${m.lastName}`;
    this.initials = `${m.firstName[0]}${m.lastName[0]}`.toUpperCase();
  }
}
