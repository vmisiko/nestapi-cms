import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FollowUpRepository } from '../follow-up.repository';
import { FollowUpEntity } from '../follow-up.entity';
import { FollowUpAttemptEntity } from '../follow-up-attempt.entity';
import { FollowUpEscalationEntity } from '../follow-up-escalation.entity';
import { FollowUpSource, FollowUpStatus } from '../../domain/follow-up';

const makeTask = (overrides: Partial<FollowUpEntity> = {}): FollowUpEntity => {
  const task = new FollowUpEntity();
  Object.assign(task, {
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
    ...overrides,
  });
  return task;
};

describe('FollowUpRepository', () => {
  let repository: FollowUpRepository;
  let tasksOrm: { findOne: jest.Mock; save: jest.Mock; count: jest.Mock };
  let attemptsOrm: { create: jest.Mock; save: jest.Mock };
  let escalationsOrm: { create: jest.Mock; save: jest.Mock; find: jest.Mock };

  beforeEach(async () => {
    tasksOrm = { findOne: jest.fn(), save: jest.fn(), count: jest.fn() };
    attemptsOrm = { create: jest.fn(), save: jest.fn() };
    escalationsOrm = { create: jest.fn(), save: jest.fn(), find: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        FollowUpRepository,
        { provide: getRepositoryToken(FollowUpEntity), useValue: tasksOrm },
        {
          provide: getRepositoryToken(FollowUpAttemptEntity),
          useValue: attemptsOrm,
        },
        {
          provide: getRepositoryToken(FollowUpEscalationEntity),
          useValue: escalationsOrm,
        },
      ],
    }).compile();

    repository = module.get(FollowUpRepository);
  });

  describe('update', () => {
    it('sets completedAt when the status changes to completed', async () => {
      const task = makeTask();
      tasksOrm.findOne.mockResolvedValue(task);
      tasksOrm.save.mockImplementation((t) => Promise.resolve(t));

      const result = await repository.update('task-id', {
        status: FollowUpStatus.COMPLETED,
      });

      expect(result?.completedAt).toBeInstanceOf(Date);
    });

    it('clears completedAt when a completed task is cancelled', async () => {
      const task = makeTask({
        status: FollowUpStatus.COMPLETED,
        completedAt: new Date('2026-09-10T00:00:00Z'),
      });
      tasksOrm.findOne.mockResolvedValue(task);
      tasksOrm.save.mockImplementation((t) => Promise.resolve(t));

      const result = await repository.update('task-id', {
        status: FollowUpStatus.CANCELLED,
      });

      expect(result?.completedAt).toBeNull();
    });

    it('clears completedAt when a completed task is reopened', async () => {
      const task = makeTask({
        status: FollowUpStatus.COMPLETED,
        completedAt: new Date('2026-09-10T00:00:00Z'),
      });
      tasksOrm.findOne.mockResolvedValue(task);
      tasksOrm.save.mockImplementation((t) => Promise.resolve(t));

      const result = await repository.update('task-id', {
        status: FollowUpStatus.OPEN,
      });

      expect(result?.completedAt).toBeNull();
    });

    it('leaves completedAt untouched when the update does not change status', async () => {
      const completedAt = new Date('2026-09-10T00:00:00Z');
      const task = makeTask({ status: FollowUpStatus.COMPLETED, completedAt });
      tasksOrm.findOne.mockResolvedValue(task);
      tasksOrm.save.mockImplementation((t) => Promise.resolve(t));

      const result = await repository.update('task-id', {
        notes: 'Updated notes only',
      });

      expect(result?.completedAt).toBe(completedAt);
    });

    it('returns null when the task does not exist', async () => {
      tasksOrm.findOne.mockResolvedValue(null);

      const result = await repository.update('missing-id', {
        status: FollowUpStatus.COMPLETED,
      });

      expect(result).toBeNull();
      expect(tasksOrm.save).not.toHaveBeenCalled();
    });
  });

  describe('hasOpenTaskFromSource', () => {
    it('returns true when an open task from the source already exists', async () => {
      tasksOrm.count.mockResolvedValue(1);

      const result = await repository.hasOpenTaskFromSource(
        'member-id',
        FollowUpSource.VISITOR_AUTOMATION,
      );

      expect(result).toBe(true);
    });

    it('returns false when no open task from the source exists', async () => {
      tasksOrm.count.mockResolvedValue(0);

      const result = await repository.hasOpenTaskFromSource(
        'member-id',
        FollowUpSource.VISITOR_AUTOMATION,
      );

      expect(result).toBe(false);
    });
  });

  describe('escalate', () => {
    it('reassigns the task, bumps the escalation level, and records history', async () => {
      const task = makeTask({ ownerId: 'staff-id' });
      tasksOrm.findOne.mockResolvedValue(task);
      tasksOrm.save.mockImplementation((t) => Promise.resolve(t));
      escalationsOrm.create.mockImplementation((data) => data);
      escalationsOrm.save.mockImplementation((e) => Promise.resolve(e));

      const result = await repository.escalate('task-id', {
        toOwnerId: 'admin-id',
        reason: 'Overdue',
      });

      expect(result?.ownerId).toBe('admin-id');
      expect(result?.escalationLevel).toBe(1);
      expect(escalationsOrm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 'task-id',
          fromOwnerId: 'staff-id',
          toOwnerId: 'admin-id',
          reason: 'Overdue',
        }),
      );
    });

    it('returns null when escalating a task that does not exist', async () => {
      tasksOrm.findOne.mockResolvedValue(null);

      const result = await repository.escalate('missing-id', {
        toOwnerId: 'admin-id',
        reason: 'Overdue',
      });

      expect(result).toBeNull();
      expect(escalationsOrm.save).not.toHaveBeenCalled();
    });
  });
});
