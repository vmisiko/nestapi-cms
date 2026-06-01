import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MemberStatus, MemberType, ActivityStatus } from '../domain/member';

@Entity('members')
export class MemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ length: 30, nullable: true })
  phone: string | null;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.GUEST })
  status: MemberStatus;

  @Column({ name: 'fellowship_id', type: 'uuid', nullable: true })
  fellowshipId: string | null;

  @Column({
    name: 'member_type',
    type: 'enum',
    enum: MemberType,
    default: MemberType.ADULT,
  })
  memberType: MemberType;

  @Column({
    name: 'activity_status',
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.ACTIVE,
  })
  activityStatus: ActivityStatus;

  @Column({ name: 'joined_at', type: 'date', default: () => 'CURRENT_DATE' })
  joinedAt: string;

  @Column({ name: 'avatar_url', length: 500, nullable: true })
  avatarUrl: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
