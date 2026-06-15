import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InventoryItemEntity } from './inventory-item.entity';
import type { StockMovementType } from '../domain/stock-movement';

@Entity('stock_movements')
export class StockMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => InventoryItemEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: InventoryItemEntity;

  @Column({ name: 'item_name', length: 200 })
  itemName: string;

  @Column({ type: 'enum', enum: ['in', 'out', 'adjustment'] })
  type: StockMovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'performed_by', length: 200 })
  performedBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
