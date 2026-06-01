import type {
  IDamageReportRepository,
  CreateDamageReportData,
} from '../i-damage-report.repository';

export class CreateDamageReportUseCase {
  constructor(private readonly repo: IDamageReportRepository) {}
  execute(data: CreateDamageReportData) {
    return this.repo.create(data);
  }
}
