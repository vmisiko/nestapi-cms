import { FollowUpService } from '../follow-up.service';
import {
  FollowUpContactMethod,
  FollowUpOutcome,
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
});
