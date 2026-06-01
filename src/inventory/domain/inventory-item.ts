export interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  quantity: number;
  unit: string;
  minStockLevel: number;
  location: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
