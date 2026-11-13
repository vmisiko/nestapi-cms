import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import { FollowUpEntity } from './follow-up.entity';
import { FollowUpAttemptEntity } from './follow-up-attempt.entity';
import { FollowUpEscalationEntity } from './follow-up-escalation.entity';
import {
  FollowUpContactMethod,
  FollowUpOutcome,
  FollowUpPriority,
  FollowUpSource,
  FollowUpStatus,
} from '../domain/follow-up';

@Injectable()
export class FollowUpRepository {
  constructor(
    @InjectRepository(FollowUpEntity)
    private readonly tasks: Repository<FollowUpEntity>,
    @InjectRepository(FollowUpAttemptEntity)
    private readonly attempts: Repository<FollowUpAttemptEntity>,
    @InjectRepository(FollowUpEscalationEntity)
    private readonly escalations: Repository<FollowUpEscalationEntity>,
  ) {}

  /**
   * Tasks plus `attemptCount`, which lets the UI tell "pending" (no contact yet)
   * from "in progress" (open, at least one contact attempt).
   */
  async findAll(
    status?: FollowUpStatus,
    priority?: FollowUpPriority,
  ): Promise<(FollowUpEntity & { attemptCount: number })[]> {
    const tasks = await this.tasks.find({
      where: { ...(status && { status }), ...(priority && { priority }) },
      // The frontend list shows the member's name inline; join it here instead of
      // relying on its own separately-fetched, page-capped member list, which silently
      // showed "Unknown member" once the congregation passed that page size.
      relations: { member: true },
      order: { dueDate: 'ASC', createdAt: 'ASC' },
    });
    if (tasks.length === 0) return [];

    const counts = await this.attempts
      .createQueryBuilder('a')
      .select('a.taskId', 'taskId')
      .addSelect('COUNT(*)', 'count')
      .where('a.taskId IN (:...ids)', { ids: tasks.map((task) => task.id) })
      .groupBy('a.taskId')
      .getRawMany<{ taskId: string; count: string }>();
    const byTask = new Map(
      counts.map((row) => [row.taskId, Number(row.count)]),
    );

    return tasks.map((task) =>
      Object.assign(task, { attemptCount: byTask.get(task.id) ?? 0 }),
    );
  }

  findById(id: string): Promise<FollowUpEntity | null> {
    return this.tasks.findOne({ where: { id }, relations: { member: true } });
  }

  async create(data: {
    memberId: string;
    ownerId?: string | null;
    title: string;
    notes?: string | null;
    dueDate: string;
    priority?: FollowUpPriority;
    source?: FollowUpSource;
  }): Promise<FollowUpEntity> {
    const task = this.tasks.create({
      memberId: data.memberId,
      ownerId: data.ownerId ?? null,
      title: data.title,
      notes: data.notes ?? null,
      dueDate: data.dueDate,
      status: FollowUpStatus.OPEN,
      priority: data.priority ?? FollowUpPriority.NORMAL,
      source: data.source ?? FollowUpSource.MANUAL,
      escalationLevel: 0,
      escalatedAt: null,
      escalatedToId: null,
      completedAt: null,
    });
    return this.tasks.save(task);
  }

  /** True if the member already has an OPEN task created by the given automation source. */
  async hasOpenTaskFromSource(
    memberId: string,
    source: FollowUpSource,
  ): Promise<boolean> {
    const count = await this.tasks.count({
      where: { memberId, source, status: FollowUpStatus.OPEN },
    });
    return count > 0;
  }

  /** OPEN tasks past due by more than `graceDays`, not yet escalated. */
  findOverdueUnescalated(cutoffDate: string): Promise<FollowUpEntity[]> {
    return this.tasks.find({
      where: {
        status: FollowUpStatus.OPEN,
        escalationLevel: 0,
        dueDate: LessThan(cutoffDate),
      },
    });
  }

  /** Number of OPEN tasks that have no owner yet. */
  countUnassignedOpen(): Promise<number> {
    return this.tasks.count({
      where: { ownerId: IsNull(), status: FollowUpStatus.OPEN },
    });
  }

  /** Assign the given OPEN tasks to one owner in a single statement; returns how many changed. */
  async assignOwner(taskIds: string[], ownerId: string): Promise<number> {
    const result = await this.tasks.update(
      { id: In(taskIds), status: FollowUpStatus.OPEN },
      { ownerId },
    );
    return result.affected ?? 0;
  }

  countOpenByOwner(ownerId: string): Promise<number> {
    return this.tasks.count({
      where: { ownerId, status: FollowUpStatus.OPEN },
    });
  }

  async escalate(
    id: string,
    data: { toOwnerId: string; reason: string },
  ): Promise<FollowUpEntity | null> {
    const task = await this.findById(id);
    if (!task) return null;

    const fromOwnerId = task.ownerId;
    const escalatedAt = new Date();

    task.ownerId = data.toOwnerId;
    task.escalationLevel += 1;
    task.escalatedAt = escalatedAt;
    task.escalatedToId = data.toOwnerId;
    await this.tasks.save(task);

    const escalation = this.escalations.create({
      taskId: id,
      fromOwnerId,
      toOwnerId: data.toOwnerId,
      reason: data.reason,
    });
    await this.escalations.save(escalation);

    return task;
  }

  findEscalations(taskId: string): Promise<FollowUpEscalationEntity[]> {
    return this.escalations.find({
      where: { taskId },
      order: { escalatedAt: 'DESC' },
    });
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
      priority?: FollowUpPriority;
    },
  ): Promise<FollowUpEntity | null> {
    const task = await this.findById(id);
    if (!task) return null;

    // A request body parsed into a DTO can carry every field as an explicit
    // `undefined`; copying those would blank the task's fields in the response.
    Object.assign(
      task,
      Object.fromEntries(
        Object.entries(data).filter(([, value]) => value !== undefined),
      ),
    );
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
