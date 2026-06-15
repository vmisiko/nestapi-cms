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
import type { ItemRequestStatus } from '../domain/item-request';

@Entity('item_requests')
export class ItemRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200 })
  requester: string;

  @Column({ name: 'requester_avatar', length: 10 })
  requesterAvatar: string;

  @Column({ name: 'item_id', type: 'uuid' })
  itemId: string;

  @ManyToOne(() => InventoryItemEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'item_id' })
  item: InventoryItemEntity;

  @Column({ name: 'item_name', length: 200 })
  itemName: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'request_date', type: 'date' })
  requestDate: string;

  @Column({ name: 'return_date', type: 'date' })
  returnDate: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'returned'],
    default: 'pending',
  })
  status: ItemRequestStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
