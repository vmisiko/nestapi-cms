import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from './member.entity';
import type {
  IMemberRepository,
  MemberFilters,
  CreateMemberData,
  UpdateMemberData,
} from '../domain/i-member.repository';
import type { Member, AssignedDepartment } from '../domain/member';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

@Injectable()
export class MemberRepository implements IMemberRepository {
  constructor(
    @InjectRepository(MemberEntity)
    private readonly orm: Repository<MemberEntity>,
  ) {}

  async findAll(
    filters?: MemberFilters,
  ): Promise<Either<DataError, { data: Member[]; total: number }>> {
    try {
      const page = filters?.page ?? 1;
      const limit = filters?.limit ?? 50;

      const qb = this.orm.createQueryBuilder('m').orderBy('m.last_name', 'ASC');

      if (filters?.status)
        qb.andWhere('m.status = :status', { status: filters.status });
      if (filters?.fellowshipId)
        qb.andWhere('m.fellowship_id = :fellowshipId', {
          fellowshipId: filters.fellowshipId,
        });
      if (filters?.hasFellowship === true)
        qb.andWhere('m.fellowship_id IS NOT NULL');
      if (filters?.hasFellowship === false)
        qb.andWhere('m.fellowship_id IS NULL');
      if (filters?.memberType)
        qb.andWhere('m.member_type = :memberType', {
          memberType: filters.memberType,
        });
      if (filters?.activityStatus)
        qb.andWhere('m.activity_status = :activityStatus', {
          activityStatus: filters.activityStatus,
        });
      if (filters?.search) {
        qb.andWhere(
          "(LOWER(m.first_name || ' ' || m.last_name) LIKE :search OR LOWER(m.email) LIKE :search)",
          { search: `%${filters.search.toLowerCase()}%` },
        );
      }
      if (filters?.joinDateRange && filters.joinDateRange !== 'all') {
        const ranges: Record<string, string> = {
          week: "NOW() - INTERVAL '7 days'",
          month: "DATE_TRUNC('month', NOW())",
          recently: "NOW() - INTERVAL '30 days'",
        };
        if (ranges[filters.joinDateRange]) {
          qb.andWhere(`m.joined_at >= ${ranges[filters.joinDateRange]}`);
        }
      }
      if (filters?.departmentId) {
        qb.innerJoin(
          'member_departments',
          'md',
          'md.member_id = m.id AND md.department_id = :deptId',
          { deptId: filters.departmentId },
        );
      }

      const total = await qb.getCount();
      const entities = await qb
        .skip((page - 1) * limit)
        .take(limit)
        .getMany();
      return Either.right({ data: entities.map(this.toMember), total });
    } catch (err) {
      console.error('[MemberRepository.findAll]', err);
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch members'),
      );
    }
  }

  async findById(id: string): Promise<Either<DataError, Member>> {
    try {
      const entity = await this.orm.findOne({ where: { id } });
      if (!entity)
        return Either.left(DataError.notFound(`Member ${id} not found`));
      return Either.right(this.toMember(entity));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch member'),
      );
    }
  }

  async create(data: CreateMemberData): Promise<Either<DataError, Member>> {
    try {
      const entity = this.orm.create(data);
      const saved = await this.orm.save(entity);
      return Either.right(this.toMember(saved));
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to create member'),
      );
    }
  }

  async update(
    id: string,
    data: UpdateMemberData,
  ): Promise<Either<DataError, Member>> {
    try {
      await this.orm.update(id, data);
      return this.findById(id);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to update member'),
      );
    }
  }

  async delete(id: string): Promise<Either<DataError, void>> {
    try {
      const result = await this.orm.delete(id);
      if (result.affected === 0)
        return Either.left(DataError.notFound(`Member ${id} not found`));
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to delete member'),
      );
    }
  }

  async findDepartments(
    memberId: string,
  ): Promise<Either<DataError, AssignedDepartment[]>> {
    try {
      const member = await this.orm.findOne({
        where: { id: memberId },
        relations: ['departments'],
      });
      if (!member)
        return Either.left(DataError.notFound(`Member ${memberId} not found`));
      return Either.right(
        member.departments.map((d) => ({ id: d.id, name: d.name })),
      );
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to fetch member departments'),
      );
    }
  }

  async assignDepartment(
    memberId: string,
    departmentId: string,
  ): Promise<Either<DataError, void>> {
    try {
      await this.orm
        .createQueryBuilder()
        .relation(MemberEntity, 'departments')
        .of(memberId)
        .add(departmentId);
      return Either.right(undefined);
    } catch {
      return Either.left(
        DataError.conflict('Member is already in this department'),
      );
    }
  }

  async removeDepartment(
    memberId: string,
    departmentId: string,
  ): Promise<Either<DataError, void>> {
    try {
      await this.orm
        .createQueryBuilder()
        .relation(MemberEntity, 'departments')
        .of(memberId)
        .remove(departmentId);
      return Either.right(undefined);
    } catch {
      return Either.left(
        new DataError('NetworkError', 'Failed to remove department assignment'),
      );
    }
  }

  private toMember = (e: MemberEntity): Member => ({
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    phone: e.phone,
    email: e.email,
    status: e.status,
    fellowshipId: e.fellowshipId,
    memberType: e.memberType,
    activityStatus: e.activityStatus,
    joinedAt: e.joinedAt,
    avatarUrl: e.avatarUrl,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
