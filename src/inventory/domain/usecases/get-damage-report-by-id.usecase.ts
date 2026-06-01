import type { IDamageReportRepository } from '../i-damage-report.repository';

export class GetDamageReportByIdUseCase {
  constructor(private readonly repo: IDamageReportRepository) {}
  execute(id: string) {
    return this.repo.findById(id);
  }
}
