export enum DamageType {
  BROKEN = 'broken',
  LOST = 'lost',
  STOLEN = 'stolen',
  WEAR = 'wear',
  OTHER = 'other',
}
export enum DamageSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  TOTAL_LOSS = 'total_loss',
}
export enum DamageStatus {
  PENDING = 'pending',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  WRITTEN_OFF = 'written_off',
}

export interface DamageReport {
  id: string;
  itemId: string;
  reportedByName: string;
  damageType: DamageType;
  severity: DamageSeverity;
  quantityAffected: number;
  description: string;
  reportDate: string;
  status: DamageStatus;
  resolution: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
