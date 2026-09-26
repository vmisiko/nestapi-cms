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
import { CareRecordType, CareRecordStatus } from '../domain/care-record';
import type { MemberEntity } from '../../members/infrastructure/member.entity';
import type { UserEntity } from '../../users/infrastructure/user.entity';

@Entity('care_records')
export class CareRecordEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @ManyToOne('MemberEntity', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member?: MemberEntity;

  @Column({ type: 'enum', enum: CareRecordType })
  type: CareRecordType;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'handled_by', type: 'uuid', nullable: true })
  handledBy: string | null;

  @ManyToOne('UserEntity', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'handled_by' })
  handler?: UserEntity;

  @Column({
    type: 'enum',
    enum: CareRecordStatus,
    default: CareRecordStatus.OPEN,
  })
  status: CareRecordStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;
}
