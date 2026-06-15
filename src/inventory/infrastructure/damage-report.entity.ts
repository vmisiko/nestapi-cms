import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryItemEntity } from './inventory-item.entity';

@Entity('damage_reports')
export class DamageReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => InventoryItemEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: InventoryItemEntity;

  @Column({ name: 'reported_by_name', type: 'varchar', length: 200 })
  reportedByName: string;

  @Column({ name: 'damage_type', type: 'varchar', length: 20 })
  damageType: string;

  @Column({ type: 'varchar', length: 20 })
  severity: string;

  @Column({ name: 'quantity_affected', type: 'int' })
  quantityAffected: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'report_date', type: 'date' })
  reportDate: string;

  @Column({ type: 'varchar', length: 30, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  resolution: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
