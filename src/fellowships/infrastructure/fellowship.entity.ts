import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ActivityStatus } from '../../core/domain/enums';
import { FellowshipZoneEntity } from '../../fellowship-zones/infrastructure/fellowship-zone.entity';
import type { MemberEntity } from '../../members/infrastructure/member.entity';

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

  @ManyToOne(() => FellowshipZoneEntity, (zone) => zone.fellowships, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'zone_id' })
  zone: FellowshipZoneEntity;

  @Column({ name: 'leader_id', type: 'uuid', nullable: true })
  leaderId: string | null;

  @ManyToOne('MemberEntity', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'leader_id' })
  leader?: MemberEntity;

  @OneToMany('MemberEntity', 'fellowship')
  members: MemberEntity[];

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
