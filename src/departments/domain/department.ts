export interface Department {
  id: string;
  name: string;
  headId: string | null;
  memberTarget: number;
  annualBudget: number;
  budgetSpent: number;
  description: string | null;
  memberCount: number;
  createdAt: Date;
  updatedAt: Date;
}
