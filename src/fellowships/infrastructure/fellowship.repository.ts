import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FellowshipEntity } from './fellowship.entity';
import type {
  IFellowshipRepository,
  FellowshipFilters,
  CreateFellowshipData,
  UpdateFellowshipData,
} from '../domain/i-fellowship.repository';
import type { Fellowship } from '../domain/fellowship';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

type RawRow = { memberCount?: string | number };

@Injectable()
export class FellowshipRepository implements IFellowshipRepository {
  constructor(
    @InjectRepository(FellowshipEntity)
    private readonly orm: Repository<FellowshipEntity>,
  ) {}

  async findAll(
    filters?: FellowshipFilters,
  ): Promise<Either<DataError, Fellowship[]>> {
    try {
      const qb = this.orm
        .createQueryBuilder('f')
        .leftJoin(
          'members',
          'm',
          'm.fellowship_id = f.id AND m.activity_status = :active',
          {
            active: 'active',
          },
        )
        .addSelect('COALESCE(COUNT(m.id), 0)::int', 'memberCount')
        .groupBy('f.id')
        .orderBy('f.name', 'ASC');

      if (filters?.zoneId)
        qb.andWhere('f.zone_id = :zoneId', { zoneId: filters.zoneId });
      if (filters?.status)
        qb.andWhere('f.status = :status', { status: filters.status });

      const raw = await qb.getRawAndEntities();
      return Either.right(
        raw.entities.map((e, i) =>
          this.toFellowship(
            e,
            Number((raw.raw[i] as RawRow | undefined)?.memberCount ?? 0),
          ),
        ),
      );
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch fellowships'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, Fellowship>> {
    try {
      const raw = await this.orm
        .createQueryBuilder('f')
        .leftJoin(
          'members',
          'm',
          'm.fellowship_id = f.id AND m.activity_status = :active',
          {
            active: 'active',
          },
        )
        .addSelect('COALESCE(COUNT(m.id), 0)::int', 'memberCount')
        .where('f.id = :id', { id })
        .groupBy('f.id')
        .getRawAndEntities();

      if (!raw.entities[0])
        return Either.left(DataError.notFound(`Fellowship ${id} not found`));
      return Either.right(
        this.toFellowship(
          raw.entities[0],
          Number((raw.raw[0] as RawRow | undefined)?.memberCount ?? 0),
        ),
      );
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch fellowship'),
      );
    }
  }

  async findBySlug(slug: string): Promise<Either<DataError, Fellowship>> {
    try {
      const raw = await this.orm
        .createQueryBuilder('f')
        .leftJoin(
          'members',
          'm',
          'm.fellowship_id = f.id AND m.activity_status = :active',
          {
            active: 'active',
          },
        )
        .addSelect('COALESCE(COUNT(m.id), 0)::int', 'memberCount')
        .where('f.slug = :slug', { slug })
        .groupBy('f.id')
        .getRawAndEntities();

      if (!raw.entities[0])
        return Either.left(
          DataError.notFound(`Fellowship "${slug}" not found`),
        );
      return Either.right(
        this.toFellowship(
          raw.entities[0],
          Number((raw.raw[0] as RawRow | undefined)?.memberCount ?? 0),
        ),
      );
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch fellowship'),
      );
    }
  }

  async findByName(
    name: string,
  ): Promise<Either<DataError, Fellowship | null>> {
    try {
      const entity = await this.orm.findOne({ where: { name } });
      return Either.right(entity ? this.toFellowship(entity, 0) : null);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch fellowship'),
      );
    }
  }

  async create(
    data: CreateFellowshipData,
  ): Promise<Either<DataError, Fellowship>> {
    try {
      const entity = this.orm.create(data);
      const saved = await this.orm.save(entity);
      return Either.right(this.toFellowship(saved, 0));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create fellowship'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateFellowshipData,
  ): Promise<Either<DataError, Fellowship>> {
    try {
      await this.orm.update(id, data);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update fellowship'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(DataError.notFound(`Fellowship ${id} not found`));
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete fellowship'),
      );
    }
  }

  private toFellowship = (
    e: FellowshipEntity,
    memberCount: number,
  ): Fellowship => ({
    id: e.id,
    name: e.name,
    slug: e.slug,
    zoneId: e.zoneId,
    leaderId: e.leaderId,
    meetingDay: e.meetingDay,
    meetingTime: e.meetingTime,
    location: e.location,
    status: e.status,
    description: e.description,
    memberCount,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
