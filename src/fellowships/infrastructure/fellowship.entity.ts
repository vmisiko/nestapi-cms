import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActivityStatus } from '../../core/domain/enums';

@Entity('fellowships')
export class FellowshipEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 150 })
  name: string;

  @Index({ unique: true })
  @Column({ length: 150 })
  slug: string;

  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId: string;

  @Column({ name: 'leader_id', type: 'uuid', nullable: true })
  leaderId: string | null;

  @Column({ name: 'meeting_day', length: 20 })
  meetingDay: string;

  @Column({ name: 'meeting_time', type: 'time' })
  meetingTime: string;

  @Column({ length: 255 })
  location: string;

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.ACTIVE,
  })
  status: ActivityStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
