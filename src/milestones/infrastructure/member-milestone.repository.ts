import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberMilestoneEntity } from './member-milestone.entity';
import type { IMemberMilestoneRepository } from '../domain/i-milestone.repository';
import type { MemberMilestone } from '../domain/milestone-type';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class MemberMilestoneRepository implements IMemberMilestoneRepository {
  constructor(
    @InjectRepository(MemberMilestoneEntity)
    private readonly orm: Repository<MemberMilestoneEntity>,
  ) {}

  async findByMember(
    memberId: string,
  ): Promise<Either<DataError, MemberMilestone[]>> {
    try {
      const entities = await this.orm.find({
        where: { memberId },
        order: { achievedAt: 'DESC' },
      });
      return Either.right(entities.map(this.toMilestone));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch member milestones'),
      );
    }
  }

  async create(data: {
    memberId: string;
    milestoneTypeId: string;
    achievedAt?: string;
    notes?: string | null;
  }): Promise<Either<DataError, MemberMilestone>> {
    try {
      const entity = this.orm.create({
        memberId: data.memberId,
        milestoneTypeId: data.milestoneTypeId,
        achievedAt: data.achievedAt,
        notes: data.notes ?? null,
      });
      const saved = await this.orm.save(entity);
      return Either.right(this.toMilestone(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to record milestone'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(DataError.notFound(`Milestone ${id} not found`));
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete milestone'),
      );
    }
  }

  private toMilestone = (e: MemberMilestoneEntity): MemberMilestone => ({
    id: e.id,
    memberId: e.memberId,
    milestoneTypeId: e.milestoneTypeId,
    achievedAt: e.achievedAt,
    notes: e.notes ?? null,
    createdAt: e.createdAt,
  });
}
