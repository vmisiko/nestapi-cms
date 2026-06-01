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

@Entity('inventory_items')
export class InventoryItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  name: string;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => InventoryCategoryEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: InventoryCategoryEntity;

  @Column({ type: 'int', default: 0 })
  quantity: number;

  @Column({ length: 50 })
  unit: string;

  @Column({ name: 'min_stock_level', type: 'int', default: 0 })
  minStockLevel: number;

  @Column({ length: 255, nullable: true })
  location: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
