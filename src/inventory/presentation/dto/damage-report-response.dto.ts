import type { DamageReport } from '../../domain/damage-report';

export class DamageReportResponseDto {
  id: string;
  itemId: string;
  quantityDamaged: number;
  description: string;
  reportedBy: string;
  status: string;
  resolvedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(r: DamageReport) {
    this.id = r.id;
    this.itemId = r.itemId;
    this.quantityDamaged = r.quantityDamaged;
    this.description = r.description;
    this.reportedBy = r.reportedBy;
    this.status = r.status;
    this.resolvedAt = r.resolvedAt;
    this.notes = r.notes;
    this.createdAt = r.createdAt;
    this.updatedAt = r.updatedAt;
  }
}
