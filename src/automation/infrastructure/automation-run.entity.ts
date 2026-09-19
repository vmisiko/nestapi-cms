import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  AutomationRunStatus,
  AutomationTrigger,
} from '../domain/automation-run';

@Entity('automation_runs')
export class AutomationRunEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AutomationTrigger,
    enumName: 'automation_trigger',
  })
  trigger: AutomationTrigger;

  @Column({
    type: 'enum',
    enum: AutomationRunStatus,
    enumName: 'automation_run_status',
  })
  status: AutomationRunStatus;

  @Column({ name: 'items_processed', type: 'int', default: 0 })
  itemsProcessed: number;

  @Column({ name: 'items_created', type: 'int', default: 0 })
  itemsCreated: number;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @CreateDateColumn({ name: 'ran_at', type: 'timestamptz' })
  ranAt: Date;
}
