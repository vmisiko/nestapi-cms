export interface InventoryCategory {
  id: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
