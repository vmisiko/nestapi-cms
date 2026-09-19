import { AutomationRunLogService } from '../automation-run-log.service';
import {
  AutomationRunStatus,
  AutomationTrigger,
} from '../../domain/automation-run';

describe('AutomationRunLogService', () => {
  it('logs a success run with the processed/created counts', async () => {
    const runs = {
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AutomationRunLogService(runs as never);

    const result = await service.record(AutomationTrigger.VISITOR_SIGNUP, () =>
      Promise.resolve({ processed: 3, created: 1 }),
    );

    expect(result).toEqual({ processed: 3, created: 1 });
    expect(runs.save).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: AutomationTrigger.VISITOR_SIGNUP,
        status: AutomationRunStatus.SUCCESS,
        itemsProcessed: 3,
        itemsCreated: 1,
      }),
    );
  });

  it('logs a failed run and swallows the error instead of throwing', async () => {
    const runs = {
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AutomationRunLogService(runs as never);

    const result = await service.record(
      AutomationTrigger.INACTIVITY_SWEEP,
      () => Promise.reject(new Error('db unreachable')),
    );

    expect(result).toEqual({ processed: 0, created: 0 });
    expect(runs.save).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: AutomationTrigger.INACTIVITY_SWEEP,
        status: AutomationRunStatus.FAILED,
        detail: 'db unreachable',
      }),
    );
  });
});
