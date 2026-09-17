import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowUpEntity } from './follow-up.entity';
import { FollowUpAttemptEntity } from './follow-up-attempt.entity';
import {
  FollowUpContactMethod,
  FollowUpOutcome,
  FollowUpStatus,
} from '../domain/follow-up';

@Injectable()
export class FollowUpRepository {
  constructor(
    @InjectRepository(FollowUpEntity)
    private readonly tasks: Repository<FollowUpEntity>,
    @InjectRepository(FollowUpAttemptEntity)
    private readonly attempts: Repository<FollowUpAttemptEntity>,
  ) {}

  findAll(status?: FollowUpStatus): Promise<FollowUpEntity[]> {
    return this.tasks.find({
      where: status ? { status } : undefined,
      order: { dueDate: 'ASC', createdAt: 'ASC' },
    });
  }

  findById(id: string): Promise<FollowUpEntity | null> {
    return this.tasks.findOne({ where: { id } });
  }

  async create(data: {
    memberId: string;
    ownerId?: string | null;
    title: string;
    notes?: string | null;
    dueDate: string;
  }): Promise<FollowUpEntity> {
    const task = this.tasks.create({
      memberId: data.memberId,
      ownerId: data.ownerId ?? null,
      title: data.title,
      notes: data.notes ?? null,
      dueDate: data.dueDate,
      status: FollowUpStatus.OPEN,
      completedAt: null,
    });
    return this.tasks.save(task);
  }

  async update(
    id: string,
    data: {
      memberId?: string;
      ownerId?: string | null;
      title?: string;
      notes?: string | null;
      dueDate?: string;
      status?: FollowUpStatus;
    },
  ): Promise<FollowUpEntity | null> {
    const task = await this.findById(id);
    if (!task) return null;

    Object.assign(task, data);
    if (data.status) {
      task.completedAt =
        data.status === FollowUpStatus.COMPLETED ? new Date() : null;
    }

    return this.tasks.save(task);
  }

  async createAttempt(
    taskId: string,
    data: {
      contactMethod: FollowUpContactMethod;
      outcome: FollowUpOutcome;
      notes?: string | null;
      contactedAt?: string;
      createdById?: string | null;
    },
  ): Promise<FollowUpAttemptEntity> {
    const attempt = this.attempts.create({
      taskId,
      contactMethod: data.contactMethod,
      outcome: data.outcome,
      notes: data.notes ?? null,
      contactedAt: data.contactedAt ? new Date(data.contactedAt) : new Date(),
      createdById: data.createdById ?? null,
    });
    return this.attempts.save(attempt);
  }

  findAttempts(taskId: string): Promise<FollowUpAttemptEntity[]> {
    return this.attempts.find({
      where: { taskId },
      order: { contactedAt: 'DESC' },
    });
  }
}
