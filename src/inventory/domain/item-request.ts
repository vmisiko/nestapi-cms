export type ItemRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'returned';

export interface ItemRequest {
  id: string;
  requester: string;
  requesterAvatar: string;
  itemId: string;
  itemName: string;
  quantity: number;
  reason: string | null;
  requestDate: string;
  returnDate: string;
  status: ItemRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}
