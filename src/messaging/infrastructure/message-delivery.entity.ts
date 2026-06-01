import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DeliveryStatus } from '../domain/message-delivery';
import { MessageEntity } from './message.entity';

@Entity('message_deliveries')
export class MessageDeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', type: 'uuid' })
  @Index()
  messageId: string;

  @ManyToOne(() => MessageEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'message_id' })
  message: MessageEntity;

  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @Column({ name: 'member_name', length: 255 })
  memberName: string;

  @Column({ length: 30 })
  phone: string;

  @Column({ type: 'text' })
  text: string;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({ name: 'uwazii_ref', length: 100, nullable: true })
  @Index({ unique: true, where: '"uwazii_ref" IS NOT NULL' })
  uwaziRef: string | null;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
