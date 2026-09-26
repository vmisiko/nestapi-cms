import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneTypeEntity } from './milestone-type.entity';
import type { IMilestoneTypeRepository } from '../domain/i-milestone.repository';
import type { MilestoneType } from '../domain/milestone-type';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class MilestoneTypeRepository implements IMilestoneTypeRepository {
  constructor(
    @InjectRepository(MilestoneTypeEntity)
    private readonly orm: Repository<MilestoneTypeEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, MilestoneType[]>> {
    try {
      const entities = await this.orm.find({ order: { name: 'ASC' } });
      return Either.right(entities.map(this.toType));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch milestone types'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, MilestoneType>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(DataError.notFound(`Milestone type ${id} not found`));
      return Either.right(this.toType(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch milestone type'),
      );
    }
  }

  async create(data: {
    name: string;
    description?: string | null;
  }): Promise<Either<DataError, MilestoneType>> {
    try {
      const entity = this.orm.create({
        name: data.name,
        description: data.description ?? null,
      });
      const saved = await this.orm.save(entity);
      return Either.right(this.toType(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create milestone type'),
      );
    }
  }

  async update(
    id: string,
    data: { name?: string; description?: string | null },
  ): Promise<Either<DataError, MilestoneType>> {
    try {
      await this.orm.update(id, data);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update milestone type'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(DataError.notFound(`Milestone type ${id} not found`));
      return Either.right(undefined);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('foreign key') || message.includes('violates')) {
        return Either.left(
          DataError.conflict(
            'Cannot delete a milestone type that has been recorded against members',
          ),
        );
      }
      return Either.left(
        new DataError('NetworkError', 'Failed to delete milestone type'),
      );
    }
  }

  private toType = (e: MilestoneTypeEntity): MilestoneType => ({
    id: e.id,
    name: e.name,
    description: e.description ?? null,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
