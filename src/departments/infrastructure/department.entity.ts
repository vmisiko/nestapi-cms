import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('departments')
export class DepartmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ name: 'head_id', type: 'uuid', nullable: true })
  headId: string | null;

  @Column({ name: 'member_target', type: 'int', default: 0 })
  memberTarget: number;

  @Column({
    name: 'annual_budget',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  annualBudget: number;

  @Column({
    name: 'budget_spent',
    type: 'numeric',
    precision: 12,
    scale: 2,
    default: 0,
  })
  budgetSpent: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
