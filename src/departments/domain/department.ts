export interface Department {
  id: string;
  name: string;
  headId: string | null;
  memberTarget: number;
  annualBudget: number;
  budgetSpent: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}
