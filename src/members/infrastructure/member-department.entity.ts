import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity('member_departments')
@Unique(['memberId', 'departmentId'])
export class MemberDepartmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'member_id', type: 'uuid' })
  memberId: string;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @Column({ length: 100, nullable: true })
  role: string | null;

  @Column({ name: 'joined_at', type: 'date', default: () => 'CURRENT_DATE' })
  joinedAt: string;
}
