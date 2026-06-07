import { ApiProperty } from '@nestjs/swagger';
import type { Department } from '../../domain/department';

export class DepartmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  headId: string | null;

  @ApiProperty()
  memberTarget: number;

  @ApiProperty()
  annualBudget: number;

  @ApiProperty()
  budgetSpent: number;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty()
  memberCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(d: Department) {
    Object.assign(this, d);
  }
}
