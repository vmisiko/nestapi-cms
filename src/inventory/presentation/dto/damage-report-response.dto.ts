import { ApiProperty } from '@nestjs/swagger';
import type { DamageReport } from '../../domain/damage-report';

export class DamageReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  itemId: string;

  @ApiProperty()
  quantityDamaged: number;

  @ApiProperty()
  description: string;

  @ApiProperty()
  reportedBy: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ nullable: true })
  resolvedAt: Date | null;

  @ApiProperty({ nullable: true })
  notes: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
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
