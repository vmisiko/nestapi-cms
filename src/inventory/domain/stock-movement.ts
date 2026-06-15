export type StockMovementType = 'in' | 'out' | 'adjustment';

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number;
  reason: string | null;
  performedBy: string;
  createdAt: Date;
}
