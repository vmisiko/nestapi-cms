import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FellowshipZoneEntity } from './fellowship-zone.entity';
import type {
  IFellowshipZoneRepository,
  CreateFellowshipZoneData,
  UpdateFellowshipZoneData,
} from '../domain/i-fellowship-zone.repository';
import type { FellowshipZone } from '../domain/fellowship-zone';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class FellowshipZoneRepository implements IFellowshipZoneRepository {
  constructor(
    @InjectRepository(FellowshipZoneEntity)
    private readonly orm: Repository<FellowshipZoneEntity>,
  ) {}

  async findAll(): Promise<Either<DataError, FellowshipZone[]>> {
    try {
      const entities = await this.orm.find({ order: { name: 'ASC' } });
      return Either.right(entities.map(this.toZone));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch zones'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, FellowshipZone>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(DataError.notFound(`Zone ${id} not found`));
      return Either.right(this.toZone(entity));
    } catch {
      return Either.left(new DataError('NetworkError', 'Failed to fetch zone'));
    }
  }

  async findByName(
    name: string,
  ): Promise<Either<DataError, FellowshipZone | null>> {
    try {
      const entity = await this.orm.findOne({ where: { name } });
      return Either.right(entity ? this.toZone(entity) : null);
    } catch {
      return Either.left(new DataError('NetworkError', 'Failed to fetch zone'));
    }
  }

  async create(
    data: CreateFellowshipZoneData,
  ): Promise<Either<DataError, FellowshipZone>> {
    try {
      const entity = this.orm.create(data);
      const saved = await this.orm.save(entity);
      return Either.right(this.toZone(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create zone'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateFellowshipZoneData,
  ): Promise<Either<DataError, FellowshipZone>> {
    try {
      await this.orm.update(id, data);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update zone'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(DataError.notFound(`Zone ${id} not found`));
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete zone'),
      );
    }
  }

  private toZone = (e: FellowshipZoneEntity): FellowshipZone => ({
    id: e.id,
    name: e.name,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
