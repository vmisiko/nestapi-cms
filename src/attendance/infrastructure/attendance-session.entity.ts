import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SessionType } from '../domain/attendance-session';

@Entity('attendance_sessions')
export class AttendanceSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  title: string;

  @Column({
    name: 'session_type',
    type: 'enum',
    enum: SessionType,
    default: SessionType.SUNDAY_SERVICE,
  })
  sessionType: SessionType;

  @Column({ name: 'session_date', type: 'date' })
  sessionDate: Date;

  @Column({ name: 'fellowship_id', type: 'uuid', nullable: true })
  fellowshipId: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
