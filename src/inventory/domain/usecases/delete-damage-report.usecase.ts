import type { IDamageReportRepository } from '../i-damage-report.repository';

export class DeleteDamageReportUseCase {
  constructor(private readonly repo: IDamageReportRepository) {}
  execute(id: string) {
    return this.repo.delete(id);
  }
}
