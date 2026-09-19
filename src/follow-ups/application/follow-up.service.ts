import { Injectable, NotFoundException } from '@nestjs/common';
import { FollowUpRepository } from '../infrastructure/follow-up.repository';
import { FollowUpEntity } from '../infrastructure/follow-up.entity';
import { FollowUpSource, FollowUpStatus } from '../domain/follow-up';
import { CreateFollowUpDto } from '../presentation/dto/create-follow-up.dto';
import { UpdateFollowUpDto } from '../presentation/dto/update-follow-up.dto';
import { RecordFollowUpAttemptDto } from '../presentation/dto/record-follow-up-attempt.dto';

@Injectable()
export class FollowUpService {
  constructor(private readonly repo: FollowUpRepository) {}

  findAll(status?: FollowUpStatus) {
    return this.repo.findAll(status);
  }

  async findById(id: string) {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException(`Follow-up task ${id} not found`);
    return {
      task,
      attempts: await this.repo.findAttempts(id),
    };
  }

  create(dto: CreateFollowUpDto) {
    return this.repo.create(dto);
  }

  /**
   * Create a task on behalf of an automation sweep (visitor/inactivity).
   * Skips creation if the member already has an OPEN task from the same source,
   * so a cron re-run never produces duplicates.
   */
  async createAutomated(data: {
    memberId: string;
    title: string;
    dueDate: string;
    source: FollowUpSource;
  }): Promise<{ task: FollowUpEntity | null; created: boolean }> {
    const alreadyOpen = await this.repo.hasOpenTaskFromSource(
      data.memberId,
      data.source,
    );
    if (alreadyOpen) {
      return { task: null, created: false };
    }
    const task = await this.repo.create(data);
    return { task, created: true };
  }

  async update(id: string, dto: UpdateFollowUpDto) {
    const task = await this.repo.update(id, dto);
    if (!task) throw new NotFoundException(`Follow-up task ${id} not found`);
    return task;
  }

  async recordAttempt(
    id: string,
    dto: RecordFollowUpAttemptDto,
    userId?: string,
  ) {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException(`Follow-up task ${id} not found`);

    const attempt = await this.repo.createAttempt(id, {
      ...dto,
      createdById: userId ?? null,
    });

    return { task, attempt };
  }

  async findEscalations(id: string) {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException(`Follow-up task ${id} not found`);
    return this.repo.findEscalations(id);
  }

  findOverdueUnescalated(cutoffDate: string) {
    return this.repo.findOverdueUnescalated(cutoffDate);
  }

  countOpenByOwner(ownerId: string) {
    return this.repo.countOpenByOwner(ownerId);
  }

  escalate(id: string, data: { toOwnerId: string; reason: string }) {
    return this.repo.escalate(id, data);
  }
}
