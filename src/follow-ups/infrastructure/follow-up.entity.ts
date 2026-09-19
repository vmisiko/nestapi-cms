import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import { UserEntity } from '../../users/infrastructure/user.entity';
import { FollowUpSource, FollowUpStatus } from '../domain/follow-up';

@Entity('follow_up_tasks')
export class FollowUpEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @ManyToOne(() => MemberEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: MemberEntity;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'owner_id' })
  owner: UserEntity | null;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: string;

  @Column({
    type: 'enum',
    enum: FollowUpStatus,
    enumName: 'follow_up_status',
    default: FollowUpStatus.OPEN,
  })
  status: FollowUpStatus;

  @Column({
    type: 'enum',
    enum: FollowUpSource,
    enumName: 'follow_up_source',
    default: FollowUpSource.MANUAL,
  })
  source: FollowUpSource;

  @Column({ name: 'escalation_level', type: 'int', default: 0 })
  escalationLevel: number;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt: Date | null;

  @Column({ name: 'escalated_to_id', type: 'uuid', nullable: true })
  escalatedToId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'escalated_to_id' })
  escalatedTo: UserEntity | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
