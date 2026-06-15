import { ApiProperty } from '@nestjs/swagger';
import type { DamageReport } from '../../domain/damage-report';

export class DamageReportResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() itemId: string;
  @ApiProperty() reportedByName: string;
  @ApiProperty() damageType: string;
  @ApiProperty() severity: string;
  @ApiProperty() quantityAffected: number;
  @ApiProperty() description: string;
  @ApiProperty() reportDate: string;
  @ApiProperty() status: string;
  @ApiProperty({ nullable: true }) resolution: string | null;
  @ApiProperty({ nullable: true }) notes: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(r: DamageReport) {
    this.id = r.id;
    this.itemId = r.itemId;
    this.reportedByName = r.reportedByName;
    this.damageType = r.damageType;
    this.severity = r.severity;
    this.quantityAffected = r.quantityAffected;
    this.description = r.description;
    this.reportDate = r.reportDate;
    this.status = r.status;
    this.resolution = r.resolution;
    this.notes = r.notes;
    this.createdAt = r.createdAt;
    this.updatedAt = r.updatedAt;
  }
}
