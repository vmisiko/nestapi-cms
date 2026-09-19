import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../../users/infrastructure/user.entity';
import { FollowUpEntity } from './follow-up.entity';

@Entity('follow_up_escalations')
export class FollowUpEscalationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string;

  @ManyToOne(() => FollowUpEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: FollowUpEntity;

  @Column({ name: 'from_owner_id', type: 'uuid', nullable: true })
  fromOwnerId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_owner_id' })
  fromOwner: UserEntity | null;

  @Column({ name: 'to_owner_id', type: 'uuid' })
  toOwnerId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_owner_id' })
  toOwner: UserEntity;

  @Column({ type: 'text' })
  reason: string;

  @CreateDateColumn({ name: 'escalated_at', type: 'timestamptz' })
  escalatedAt: Date;
}
