export type ItemCondition = 'excellent' | 'good' | 'fair' | 'poor';

export interface InventoryItem {
  id: string;
  name: string;
  code: string;
  categoryId: string;
  totalQty: number;
  availableQty: number;
  condition: ItemCondition | null;
  createdAt: Date;
  updatedAt: Date;
}
