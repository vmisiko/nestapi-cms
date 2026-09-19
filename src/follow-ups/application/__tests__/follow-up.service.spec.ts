import { FollowUpService } from '../follow-up.service';
import {
  FollowUpContactMethod,
  FollowUpOutcome,
  FollowUpSource,
  FollowUpStatus,
} from '../../domain/follow-up';

describe('FollowUpService', () => {
  const task = {
    id: 'task-id',
    memberId: 'member-id',
    ownerId: null,
    title: 'Welcome visitor',
    notes: null,
    dueDate: '2026-09-15',
    status: FollowUpStatus.OPEN,
    source: FollowUpSource.MANUAL,
    escalationLevel: 0,
    escalatedAt: null,
    escalatedToId: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('creates a follow-up task through the repository', async () => {
    const repo = {
      create: jest.fn().mockResolvedValue(task),
    };
    const service = new FollowUpService(repo as never);

    await service.create({
      memberId: 'member-id',
      title: 'Welcome visitor',
      dueDate: '2026-09-15',
    });

    expect(repo.create).toHaveBeenCalledWith({
      memberId: 'member-id',
      title: 'Welcome visitor',
      dueDate: '2026-09-15',
    });
  });

  it('updates a task status through the repository', async () => {
    const repo = {
      update: jest.fn().mockResolvedValue({
        ...task,
        status: FollowUpStatus.COMPLETED,
        completedAt: new Date(),
      }),
    };
    const service = new FollowUpService(repo as never);

    await service.update('task-id', { status: FollowUpStatus.COMPLETED });

    expect(repo.update).toHaveBeenCalledWith('task-id', {
      status: FollowUpStatus.COMPLETED,
    });
  });

  it('records an attempt with the authenticated actor', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue(task),
      createAttempt: jest.fn().mockResolvedValue({ id: 'attempt-id' }),
    };
    const service = new FollowUpService(repo as never);

    await service.recordAttempt(
      'task-id',
      {
        contactMethod: FollowUpContactMethod.CALL,
        outcome: FollowUpOutcome.CONNECTED,
        notes: 'Visitor plans to attend next Sunday.',
      },
      'user-id',
    );

    expect(repo.createAttempt).toHaveBeenCalledWith('task-id', {
      contactMethod: FollowUpContactMethod.CALL,
      outcome: FollowUpOutcome.CONNECTED,
      notes: 'Visitor plans to attend next Sunday.',
      createdById: 'user-id',
    });
  });

  it('creates an automated task when none is already open for the source', async () => {
    const repo = {
      hasOpenTaskFromSource: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockResolvedValue({
        ...task,
        source: FollowUpSource.VISITOR_AUTOMATION,
      }),
    };
    const service = new FollowUpService(repo as never);

    const result = await service.createAutomated({
      memberId: 'member-id',
      title: 'Welcome & connect — Jane Doe',
      dueDate: '2026-09-20',
      source: FollowUpSource.VISITOR_AUTOMATION,
    });

    expect(result.created).toBe(true);
    expect(result.task).not.toBeNull();
    expect(repo.create).toHaveBeenCalled();
  });

  it('skips creating an automated task when one is already open for the source (idempotent)', async () => {
    const repo = {
      hasOpenTaskFromSource: jest.fn().mockResolvedValue(true),
      create: jest.fn(),
    };
    const service = new FollowUpService(repo as never);

    const result = await service.createAutomated({
      memberId: 'member-id',
      title: 'Check in — inactive member',
      dueDate: '2026-09-20',
      source: FollowUpSource.INACTIVITY_AUTOMATION,
    });

    expect(result.created).toBe(false);
    expect(result.task).toBeNull();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('escalates a task to a new owner and returns the updated task', async () => {
    const repo = {
      escalate: jest.fn().mockResolvedValue({
        ...task,
        ownerId: 'admin-id',
        escalationLevel: 1,
        escalatedToId: 'admin-id',
      }),
    };
    const service = new FollowUpService(repo as never);

    await service.escalate('task-id', {
      toOwnerId: 'admin-id',
      reason: 'Overdue by more than 2 day(s)',
    });

    expect(repo.escalate).toHaveBeenCalledWith('task-id', {
      toOwnerId: 'admin-id',
      reason: 'Overdue by more than 2 day(s)',
    });
  });

  it('returns escalation history for a task', async () => {
    const repo = {
      findById: jest.fn().mockResolvedValue(task),
      findEscalations: jest.fn().mockResolvedValue([{ id: 'escalation-1' }]),
    };
    const service = new FollowUpService(repo as never);

    const escalations = await service.findEscalations('task-id');

    expect(escalations).toEqual([{ id: 'escalation-1' }]);
  });

  it('throws when requesting escalation history for a missing task', async () => {
    const repo = { findById: jest.fn().mockResolvedValue(null) };
    const service = new FollowUpService(repo as never);

    await expect(service.findEscalations('missing-id')).rejects.toThrow();
  });
});
