import { EscalationAutomationService } from '../escalation-automation.service';
import { AutomationRunLogService } from '../automation-run-log.service';
import { UserRole } from '../../../users/domain/user';

function makeConfig(overrides: Record<string, unknown> = {}) {
  return { get: jest.fn((key: string, def: unknown) => overrides[key] ?? def) };
}

describe('EscalationAutomationService', () => {
  it('escalates overdue tasks to the admin with the fewest open tasks and notifies them', async () => {
    const overdueTasks = [
      { id: 'task-1', title: 'Check in — inactive member' },
    ];
    const admins = [
      { id: 'admin-busy', role: UserRole.ADMIN, isActive: true },
      { id: 'admin-free', role: UserRole.ADMIN, isActive: true },
    ];

    const userOrm = { find: jest.fn().mockResolvedValue(admins) };
    const followUpService = {
      findOverdueUnescalated: jest.fn().mockResolvedValue(overdueTasks),
      countOpenByOwner: jest
        .fn()
        .mockImplementation((ownerId: string) =>
          Promise.resolve(ownerId === 'admin-busy' ? 5 : 1),
        ),
      escalate: jest.fn().mockResolvedValue(undefined),
    };
    const notificationsService = {
      create: jest.fn().mockResolvedValue(undefined),
    };
    const runLog = new AutomationRunLogService({
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
    } as never);

    const service = new EscalationAutomationService(
      userOrm as never,
      followUpService as never,
      notificationsService as never,
      runLog,
      makeConfig() as never,
    );

    await service.runSweep();

    expect(followUpService.escalate).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({ toOwnerId: 'admin-free' }),
    );
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin-free' }),
    );
  });

  it('does nothing when there are no overdue unescalated tasks', async () => {
    const userOrm = { find: jest.fn() };
    const followUpService = {
      findOverdueUnescalated: jest.fn().mockResolvedValue([]),
      countOpenByOwner: jest.fn(),
      escalate: jest.fn(),
    };
    const notificationsService = { create: jest.fn() };
    const runLog = new AutomationRunLogService({
      create: jest.fn((x) => x),
      save: jest.fn().mockResolvedValue(undefined),
    } as never);

    const service = new EscalationAutomationService(
      userOrm as never,
      followUpService as never,
      notificationsService as never,
      runLog,
      makeConfig() as never,
    );

    await service.runSweep();

    expect(userOrm.find).not.toHaveBeenCalled();
    expect(followUpService.escalate).not.toHaveBeenCalled();
  });
});
