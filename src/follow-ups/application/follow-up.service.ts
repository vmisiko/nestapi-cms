import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FollowUpRepository } from '../infrastructure/follow-up.repository';
import { FollowUpStatus } from '../domain/follow-up';
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

  async update(id: string, dto: UpdateFollowUpDto) {
    const task = await this.repo.update(id, dto);
    if (!task) throw new NotFoundException(`Follow-up task ${id} not found`);
    return task;
  }

  async recordAttempt(id: string, dto: RecordFollowUpAttemptDto, userId?: string) {
    const task = await this.repo.findById(id);
    if (!task) throw new NotFoundException(`Follow-up task ${id} not found`);

    const attempt = await this.repo.createAttempt(id, {
      ...dto,
      createdById: userId ?? null,
    });

    return { task, attempt };
  }
}
