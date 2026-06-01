import type { Department } from '../../domain/department';

export class DepartmentResponseDto {
  id: string;
  name: string;
  headId: string | null;
  memberTarget: number;
  annualBudget: number;
  budgetSpent: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(d: Department) {
    Object.assign(this, d);
  }
}
