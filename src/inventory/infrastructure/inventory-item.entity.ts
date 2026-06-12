import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryCategoryEntity } from './inventory-category.entity';

export type ItemCondition = 'excellent' | 'good' | 'fair' | 'poor';

@Entity('inventory_items')
export class InventoryItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => InventoryCategoryEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: InventoryCategoryEntity;

  @Column({ name: 'total_qty', type: 'int', default: 0 })
  totalQty: number;

  @Column({ name: 'available_qty', type: 'int', default: 0 })
  availableQty: number;

  @Column({
    type: 'enum',
    enum: ['excellent', 'good', 'fair', 'poor'],
    nullable: true,
  })
  condition: ItemCondition | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
