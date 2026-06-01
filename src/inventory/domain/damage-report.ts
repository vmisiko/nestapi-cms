export enum DamageReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
}

export interface DamageReport {
  id: string;
  itemId: string;
  quantityDamaged: number;
  description: string;
  reportedBy: string;
  status: DamageReportStatus;
  resolvedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
