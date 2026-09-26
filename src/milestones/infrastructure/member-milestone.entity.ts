import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { MemberEntity } from '../../members/infrastructure/member.entity';
import { MilestoneTypeEntity } from './milestone-type.entity';

@Entity('member_milestones')
export class MemberMilestoneEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @ManyToOne('MemberEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member?: MemberEntity;

  @Column({ name: 'milestone_type_id', type: 'uuid' })
  milestoneTypeId: string;

  @ManyToOne(() => MilestoneTypeEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'milestone_type_id' })
  milestoneType?: MilestoneTypeEntity;

  @Column({ name: 'achieved_at', type: 'date', default: () => 'CURRENT_DATE' })
  achievedAt: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
