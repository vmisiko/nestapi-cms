import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FollowUpRepository } from '../follow-up.repository';
import { FollowUpEntity } from '../follow-up.entity';
import { FollowUpAttemptEntity } from '../follow-up-attempt.entity';
import { FollowUpStatus } from '../../domain/follow-up';

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
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
  return task;
};

describe('FollowUpRepository', () => {
  let repository: FollowUpRepository;
  let tasksOrm: { findOne: jest.Mock; save: jest.Mock };
  let attemptsOrm: { create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    tasksOrm = { findOne: jest.fn(), save: jest.fn() };
    attemptsOrm = { create: jest.fn(), save: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        FollowUpRepository,
        { provide: getRepositoryToken(FollowUpEntity), useValue: tasksOrm },
        {
          provide: getRepositoryToken(FollowUpAttemptEntity),
          useValue: attemptsOrm,
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
});
