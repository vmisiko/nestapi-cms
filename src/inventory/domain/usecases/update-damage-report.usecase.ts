import type {
  IDamageReportRepository,
  UpdateDamageReportData,
} from '../i-damage-report.repository';

export class UpdateDamageReportUseCase {
  constructor(private readonly repo: IDamageReportRepository) {}
  execute(id: string, data: UpdateDamageReportData) {
    return this.repo.update(id, data);
  }
}
