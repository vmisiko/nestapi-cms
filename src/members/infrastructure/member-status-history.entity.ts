import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { MemberStatus } from '../domain/member';

@Entity('member_status_history')
export class MemberStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: MemberStatus,
    nullable: true,
  })
  fromStatus: MemberStatus | null;

  @Column({ name: 'to_status', type: 'enum', enum: MemberStatus })
  toStatus: MemberStatus;

  @Column({ name: 'changed_at', type: 'timestamptz', default: () => 'now()' })
  changedAt: Date;
}
