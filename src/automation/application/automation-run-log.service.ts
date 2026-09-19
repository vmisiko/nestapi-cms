import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationRunEntity } from '../infrastructure/automation-run.entity';
import {
  AutomationRunStatus,
  AutomationTrigger,
} from '../domain/automation-run';

export interface AutomationRunResult {
  processed: number;
  created: number;
}

@Injectable()
export class AutomationRunLogService {
  private readonly logger = new Logger(AutomationRunLogService.name);

  constructor(
    @InjectRepository(AutomationRunEntity)
    private readonly runs: Repository<AutomationRunEntity>,
  ) {}

  /** Runs `fn`, logs the outcome, and never lets the sweep throw (so one bad cron tick doesn't crash the process). */
  async record(
    trigger: AutomationTrigger,
    fn: () => Promise<AutomationRunResult>,
  ): Promise<AutomationRunResult> {
    try {
      const result = await fn();
      await this.runs.save(
        this.runs.create({
          trigger,
          status: AutomationRunStatus.SUCCESS,
          itemsProcessed: result.processed,
          itemsCreated: result.created,
          detail: null,
        }),
      );
      this.logger.log(
        `${trigger}: processed ${result.processed}, created ${result.created}`,
      );
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`${trigger} failed: ${message}`);
      await this.runs.save(
        this.runs.create({
          trigger,
          status: AutomationRunStatus.FAILED,
          itemsProcessed: 0,
          itemsCreated: 0,
          detail: message,
        }),
      );
      return { processed: 0, created: 0 };
    }
  }

  findRecent(limit = 50): Promise<AutomationRunEntity[]> {
    return this.runs.find({ order: { ranAt: 'DESC' }, take: limit });
  }
}
