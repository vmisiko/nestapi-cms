import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DamageReportStatus } from '../domain/damage-report';
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

  @Column({ name: 'quantity_damaged', type: 'int' })
  quantityDamaged: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'reported_by', type: 'uuid' })
  reportedBy: string;

  @Column({
    type: 'enum',
    enum: DamageReportStatus,
    default: DamageReportStatus.PENDING,
  })
  status: DamageReportStatus;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
