import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity';
import {
  FollowUpContactMethod,
  FollowUpOutcome,
} from '../domain/follow-up';
import { FollowUpEntity } from './follow-up.entity';

@Entity('follow_up_attempts')
export class FollowUpAttemptEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @ManyToOne(() => FollowUpEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: FollowUpEntity;

  @Column({
    name: 'contact_method',
    type: 'enum',
    enum: FollowUpContactMethod,
    enumName: 'follow_up_contact_method',
  })
  contactMethod: FollowUpContactMethod;

  @Column({
    type: 'enum',
    enum: FollowUpOutcome,
    enumName: 'follow_up_outcome',
  })
  outcome: FollowUpOutcome;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'contacted_at', type: 'timestamptz' })
  contactedAt: Date;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: UserEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
