import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MemberStatus, MemberType, ActivityStatus } from '../domain/member';
import type { FellowshipEntity } from '../../fellowships/infrastructure/fellowship.entity';
import { DepartmentEntity } from '../../departments/infrastructure/department.entity';

@Entity('members')
export class MemberEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Index({ unique: true, where: '"email" IS NOT NULL' })
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'enum', enum: MemberStatus, default: MemberStatus.GUEST })
  status: MemberStatus;

  @Column({ name: 'fellowship_id', type: 'uuid', nullable: true })
  fellowshipId: string | null;

  @ManyToOne('FellowshipEntity', 'members', {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'fellowship_id' })
  fellowship?: FellowshipEntity;

  @Column({
    name: 'member_type',
    type: 'enum',
    enum: MemberType,
    default: MemberType.ADULT,
  })
  memberType: MemberType;

  @Column({
    name: 'activity_status',
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.ACTIVE,
  })
  activityStatus: ActivityStatus;

  @Column({ name: 'joined_at', type: 'date', default: () => 'CURRENT_DATE' })
  joinedAt: string;

  @Column({ type: 'varchar', name: 'avatar_url', length: 500, nullable: true })
  avatarUrl: string | null;

  @ManyToMany(() => DepartmentEntity, (dept) => dept.members)
  @JoinTable({
    name: 'member_departments',
    joinColumn: { name: 'member_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'department_id', referencedColumnName: 'id' },
  })
  departments: DepartmentEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
