import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  MessageStatus,
  MessageTargetGroup,
  MessageType,
} from '../domain/message';

@Entity('messages')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.ANNOUNCEMENT,
  })
  type: MessageType;

  @Column({
    name: 'target_group',
    type: 'enum',
    enum: MessageTargetGroup,
    default: MessageTargetGroup.ALL,
  })
  targetGroup: MessageTargetGroup;

  @Column({ name: 'target_id', type: 'uuid', nullable: true })
  targetId: string | null;

  @Column({ name: 'member_ids', type: 'uuid', array: true, default: [] })
  memberIds: string[];

  @Column({ type: 'enum', enum: MessageStatus, default: MessageStatus.DRAFT })
  status: MessageStatus;

  @Column({ name: 'scheduled_at', type: 'timestamptz', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
