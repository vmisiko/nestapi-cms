import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from './member.entity';
import type {
  IMemberRepository,
  MemberFilters,
  CreateMemberData,
  UpdateMemberData,
  BulkImportRow,
  BulkImportResult,
} from '../domain/i-member.repository';
import type { Member, AssignedDepartment } from '../domain/member';
import { AgeGroup, ChurchRole, Gender } from '../../core/domain/enums';
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
        .offset((page - 1) * limit)
        .limit(limit)
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

  async bulkImport(
    rows: BulkImportRow[],
  ): Promise<Either<DataError, BulkImportResult>> {
    try {
      const result: BulkImportResult = {
        imported: 0,
        duplicates: 0,
        errors: [],
        members: [],
      };

      interface ProcessedRow {
        index: number;
        name: string;
        firstName: string;
        lastName: string;
        normalizedPhone: string | null;
        row: BulkImportRow;
      }

      const rowNum = (p: ProcessedRow) => p.row.rowIndex ?? p.index;

      const processed: ProcessedRow[] = rows.map((row, i) => {
        const parts = row.fullName.trim().split(/\s+/);
        const firstName = parts[0] ?? row.fullName;
        const lastName = parts.slice(1).join(' ') || '-';
        const normalizedPhone = row.phone
          ? this.normalizePhone(row.phone)
          : null;
        return {
          index: i + 1,
          name: row.fullName,
          firstName,
          lastName,
          normalizedPhone,
          row,
        };
      });

      // Deduplicate within batch by normalized phone AND email
      const seenPhones = new Map<string, number>();
      const seenEmails = new Map<string, number>();
      const deduped: ProcessedRow[] = [];
      for (const p of processed) {
        const emailKey = p.row.email?.toLowerCase();
        if (p.normalizedPhone && seenPhones.has(p.normalizedPhone)) {
          result.duplicates++;
          result.errors.push({
            row: rowNum(p),
            name: p.name,
            reason: 'Duplicate phone in uploaded file',
          });
          continue;
        }
        if (emailKey && seenEmails.has(emailKey)) {
          result.duplicates++;
          result.errors.push({
            row: rowNum(p),
            name: p.name,
            reason: 'Duplicate email in uploaded file',
          });
          continue;
        }
        if (p.normalizedPhone) seenPhones.set(p.normalizedPhone, p.index);
        if (emailKey) seenEmails.set(emailKey, p.index);
        deduped.push(p);
      }

      // Check existing phones in DB
      const phonesToCheck = deduped
        .map((p) => p.normalizedPhone)
        .filter((p): p is string => !!p);
      let existingPhones = new Set<string>();
      if (phonesToCheck.length > 0) {
        const existing = await this.orm
          .createQueryBuilder('m')
          .select('m.phone')
          .where('m.phone IN (:...phones)', { phones: phonesToCheck })
          .getMany();
        existingPhones = new Set(
          existing.map((e) => e.phone).filter(Boolean) as string[],
        );
      }

      // Check existing emails in DB (case-insensitive)
      const emailsToCheck = deduped
        .map((p) => p.row.email?.toLowerCase())
        .filter((e): e is string => !!e);
      let existingEmails = new Set<string>();
      if (emailsToCheck.length > 0) {
        const existing = await this.orm
          .createQueryBuilder('m')
          .select('m.email')
          .where('LOWER(m.email) IN (:...emails)', { emails: emailsToCheck })
          .getMany();
        existingEmails = new Set(
          existing
            .map((e) => e.email?.toLowerCase())
            .filter(Boolean) as string[],
        );
      }

      // Separate rows that are clear to save from duplicates
      const toSave: ProcessedRow[] = [];
      for (const p of deduped) {
        if (p.normalizedPhone && existingPhones.has(p.normalizedPhone)) {
          result.duplicates++;
          result.errors.push({
            row: rowNum(p),
            name: p.name,
            reason: 'Phone number already registered',
          });
          continue;
        }
        const emailKey = p.row.email?.toLowerCase();
        if (emailKey && existingEmails.has(emailKey)) {
          result.duplicates++;
          result.errors.push({
            row: rowNum(p),
            name: p.name,
            reason: 'Email already registered',
          });
          continue;
        }
        toSave.push(p);
      }

      // Save in parallel batches of 100 to avoid sequential round-trip bottleneck
      const BATCH_SIZE = 100;
      for (let i = 0; i < toSave.length; i += BATCH_SIZE) {
        const batch = toSave.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (p) => {
            try {
              const isOnline =
                p.row.isOnline ?? p.row.churchRole === ChurchRole.ONLINE_MEMBER;
              const isInternational =
                p.row.isInternational ??
                (isOnline &&
                  (!p.normalizedPhone ||
                    !p.normalizedPhone.startsWith('+254')));
              const entity = this.orm.create({
                firstName: p.firstName,
                lastName: p.lastName,
                phone: p.normalizedPhone,
                email: p.row.email ?? null,
                gender: p.row.gender ?? null,
                ageGroup: p.row.ageGroup ?? null,
                churchRole: p.row.churchRole ?? null,
                isOnline,
                isInternational,
                fellowshipId: p.row.fellowshipId ?? null,
                status: this.statusFromRole(p.row.churchRole),
                memberType: 'adult' as const,
                activityStatus: 'active' as const,
              } as Partial<MemberEntity>);
              const saved = await this.orm.save(entity);
              result.imported++;
              result.members.push(this.toMember(saved));
            } catch (err: unknown) {
              const message = err instanceof Error ? err.message : String(err);
              result.errors.push({
                row: rowNum(p),
                name: p.name,
                reason: `Save failed: ${message}`,
              });
            }
          }),
        );
      }

      return Either.right(result);
    } catch (err) {
      console.error('[MemberRepository.bulkImport]', err);
      return Either.left(new DataError('NetworkError', 'Bulk import failed'));
    }
  }

  private normalizePhone(raw: string): string | null {
    if (!raw?.trim()) return null;
    const original = raw.trim();
    const cleaned = original.replace(/[\s\-().]/g, '');
    if (!cleaned || cleaned.length < 7) return null;
    if (cleaned.startsWith('+254')) return cleaned;
    if (cleaned.startsWith('+')) return cleaned;
    if (cleaned.startsWith('254') && cleaned.length >= 12) return '+' + cleaned;
    if (
      (cleaned.startsWith('07') || cleaned.startsWith('01')) &&
      cleaned.length === 10
    )
      return '+254' + cleaned.slice(1);
    if (/^\d{9}$/.test(cleaned)) return '+254' + cleaned;
    return cleaned.length >= 7 ? original : null;
  }

  private statusFromRole(
    role?: ChurchRole | string,
  ): 'guest' | 'member' | 'leader' {
    if (!role) return 'member';
    if (
      [ChurchRole.PASTOR, ChurchRole.ELDER, ChurchRole.OVERSEER].includes(
        role as ChurchRole,
      )
    )
      return 'leader';
    if (
      [ChurchRole.FIRST_TIME_VISITOR, ChurchRole.REGULAR_ATTENDEE].includes(
        role as ChurchRole,
      )
    )
      return 'guest';
    return 'member';
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
    gender: (e.gender as Gender) ?? null,
    ageGroup: (e.ageGroup as AgeGroup) ?? null,
    churchRole: (e.churchRole as ChurchRole) ?? null,
    isOnline: e.isOnline ?? false,
    isInternational: e.isInternational ?? false,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  });
}
