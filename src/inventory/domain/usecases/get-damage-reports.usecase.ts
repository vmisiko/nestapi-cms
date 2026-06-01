import type { IDamageReportRepository } from '../i-damage-report.repository';

export class GetDamageReportsUseCase {
  constructor(private readonly repo: IDamageReportRepository) {}
  execute() {
    return this.repo.findAll();
  }
}
