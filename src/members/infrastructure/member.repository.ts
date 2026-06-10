import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { parse } from 'csv-parse/sync';
import { MemberEntity } from './member.entity';
import { FellowshipEntity } from '../../fellowships/infrastructure/fellowship.entity';
import type {
  IMemberRepository,
  MemberFilters,
  CreateMemberData,
  UpdateMemberData,
  BulkImportRow,
  BulkImportResult,
  BulkPreviewRow,
  BulkPreviewResponse,
} from '../domain/i-member.repository';
import type { Member, AssignedDepartment } from '../domain/member';
import { AgeGroup, ChurchRole, Gender } from '../../core/domain/enums';
import { Either } from '../../core/domain/either';
import { DataError } from '../../core/domain/data-error';

// ---------------------------------------------------------------------------
// Fellowship keyword matching — mirrors frontend lib/bulk-upload-utils.ts
// ---------------------------------------------------------------------------
const FELLOWSHIP_KEYWORDS: Array<{ keywords: string[]; name: string }> = [
  { keywords: ['kawangware'], name: 'Kawangware Fellowship' },
  { keywords: ['utawala', 'mihango'], name: 'Utawala Fellowship' },
  { keywords: ['embakasi'], name: 'Embakasi Fellowship' },
  { keywords: ['kasarani'], name: 'Kasarani Fellowship' },
  { keywords: ['roysambu'], name: 'Roysambu Fellowship' },
  { keywords: ['ngong'], name: 'Ngong Fellowship' },
  { keywords: ['thika'], name: 'Thika Fellowship' },
  { keywords: ['ruaka', 'banana'], name: 'Ruaka Fellowship' },
  { keywords: ["ng'ando", 'ngando', 'ng ando'], name: "Ng'ando Fellowship" },
  {
    keywords: ["lang'ata", 'langata', 'lang ata'],
    name: "Lang'ata Fellowship",
  },
];

// Use word-boundary patterns for short keywords (avoids matching 'uk' in 'Mukuru', etc.)
const INTERNATIONAL_AREA_PATTERNS: RegExp[] = [
  /\btanzania\b/,
  /\buganda\b/,
  /\brwanda\b/,
  /\bdubai\b/,
  /\buk\b/,
  /\busa\b/,
  /\bcanada\b/,
  /\baustralia\b/,
  /\bgermany\b/,
  /\bnetherlands\b/,
  /\bbahrain\b/,
  /\bqatar\b/,
  /\bkuwait\b/,
  /\boman\b/,
  /\bsaudi\b/,
  /\blebanon\b/,
  /\barusha\b/,
  /\bkampala\b/,
  /dar es salaam/,
];

@Injectable()
export class MemberRepository implements IMemberRepository {
  constructor(
    @InjectRepository(MemberEntity)
    private readonly orm: Repository<MemberEntity>,
    @InjectRepository(FellowshipEntity)
    private readonly fellowshipOrm: Repository<FellowshipEntity>,
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

  // ---------------------------------------------------------------------------
  // Preview bulk import — parse CSV, normalize, match fellowship, dedup
  // No data is saved; returns structured preview rows.
  // ---------------------------------------------------------------------------
  async previewBulkImport(
    csvBuffer: Buffer,
  ): Promise<Either<DataError, BulkPreviewResponse>> {
    try {
      // 1. Parse CSV
      let rawRows: Record<string, string>[];
      try {
        rawRows = parse(csvBuffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_quotes: true,
          relax_column_count: true,
        });
      } catch (parseErr) {
        const msg =
          parseErr instanceof Error ? parseErr.message : String(parseErr);
        return Either.left(DataError.validation(`CSV parse error: ${msg}`));
      }

      // 2. Build fellowship name→{id,name} map from DB
      const fellowshipEntities = await this.fellowshipOrm.find({
        select: ['id', 'name'],
      });
      // Map normalized name (lowercase) → { id, name }
      const dbFellowshipMap = new Map<string, { id: string; name: string }>();
      for (const f of fellowshipEntities) {
        dbFellowshipMap.set(f.name.toLowerCase(), { id: f.id, name: f.name });
      }

      // 3. First pass: parse all rows into intermediate objects
      interface IntermediateRow {
        rowIndex: number;
        fullName: string;
        phone: string;
        normalizedPhone: string | null;
        email: string;
        gender: string;
        ageGroup: string;
        area: string;
        churchRole: string;
        fellowshipId: string | null;
        fellowshipName: string | null;
        isOnline: boolean;
        isInternational: boolean;
        issues: string[];
        status: 'ready' | 'duplicate_in_file' | 'duplicate_in_db' | 'invalid';
      }

      const intermediate: IntermediateRow[] = rawRows.map((raw, i) => {
        const rowIndex = i + 1;
        const fullName = (raw['Full Name'] ?? raw['fullName'] ?? '').trim();
        const phone = (raw['Mobile Phone Number'] ?? raw['phone'] ?? '').trim();
        const email = (raw['Email Address'] ?? raw['email'] ?? '').trim();
        const gender = this.mapGender(raw['Gender'] ?? raw['gender'] ?? '');
        const ageGroup = this.mapAgeGroup(
          raw['Age Group'] ?? raw['ageGroup'] ?? '',
        );
        const area = (
          raw['Area of Residence'] ??
          raw['areaOfResidence'] ??
          ''
        ).trim();
        const churchRole = this.mapChurchRole(
          raw['Are you'] ?? raw['churchRole'] ?? '',
        );

        const normalizedPhone = this.normalizePhone(phone);
        const fellowshipMatch = this.matchFellowship(area, dbFellowshipMap);
        const intlArea = this.isInternationalArea(area);
        const isOnline = churchRole === 'online_member' || intlArea;
        const isInternational =
          isOnline && (!normalizedPhone || !normalizedPhone.startsWith('+254'));

        const issues: string[] = [];
        if (!fullName) issues.push('Missing name');
        if (!normalizedPhone && !email) issues.push('No phone or email');

        const status:
          | 'ready'
          | 'duplicate_in_file'
          | 'duplicate_in_db'
          | 'invalid' = !fullName ? 'invalid' : 'ready';

        return {
          rowIndex,
          fullName,
          phone,
          normalizedPhone,
          email,
          gender,
          ageGroup,
          area,
          churchRole,
          fellowshipId: fellowshipMatch?.id ?? null,
          fellowshipName: fellowshipMatch?.name ?? null,
          isOnline,
          isInternational,
          issues,
          status,
        };
      });

      // 4. Within-batch dedup (by normalizedPhone and email, case-insensitive)
      const seenPhones = new Map<string, number>(); // normalizedPhone -> rowIndex
      const seenEmails = new Map<string, number>(); // email.lower -> rowIndex

      for (const row of intermediate) {
        if (row.status === 'invalid') continue;

        const emailKey = row.email.toLowerCase();

        if (row.normalizedPhone && seenPhones.has(row.normalizedPhone)) {
          row.status = 'duplicate_in_file';
          row.issues.push(
            `Duplicate of row ${seenPhones.get(row.normalizedPhone)}`,
          );
          continue;
        }
        if (emailKey && seenEmails.has(emailKey)) {
          row.status = 'duplicate_in_file';
          row.issues.push(
            `Duplicate email — same as row ${seenEmails.get(emailKey)}`,
          );
          continue;
        }

        if (row.normalizedPhone)
          seenPhones.set(row.normalizedPhone, row.rowIndex);
        if (emailKey) seenEmails.set(emailKey, row.rowIndex);
      }

      // 5. DB dedup — query existing phones and emails for non-duplicate rows
      const phonesToCheck = intermediate
        .filter((r) => r.status === 'ready' && r.normalizedPhone)
        .map((r) => r.normalizedPhone as string);

      const emailsToCheck = intermediate
        .filter((r) => r.status === 'ready' && r.email)
        .map((r) => r.email.toLowerCase());

      let existingPhones = new Set<string>();
      if (phonesToCheck.length > 0) {
        const found = await this.orm
          .createQueryBuilder('m')
          .select('m.phone')
          .where('m.phone IN (:...phones)', { phones: phonesToCheck })
          .getMany();
        existingPhones = new Set(
          found.map((e) => e.phone).filter(Boolean) as string[],
        );
      }

      let existingEmails = new Set<string>();
      if (emailsToCheck.length > 0) {
        const found = await this.orm
          .createQueryBuilder('m')
          .select('m.email')
          .where('LOWER(m.email) IN (:...emails)', { emails: emailsToCheck })
          .getMany();
        existingEmails = new Set(
          found.map((e) => e.email?.toLowerCase()).filter(Boolean) as string[],
        );
      }

      // 6. Mark DB duplicates
      for (const row of intermediate) {
        if (row.status !== 'ready') continue;
        if (row.normalizedPhone && existingPhones.has(row.normalizedPhone)) {
          row.status = 'duplicate_in_db';
          row.issues.push('Phone number already registered');
        } else if (row.email && existingEmails.has(row.email.toLowerCase())) {
          row.status = 'duplicate_in_db';
          row.issues.push('Email already registered');
        }
      }

      // 7. Build response
      const rows: BulkPreviewRow[] = intermediate.map((r) => ({
        rowIndex: r.rowIndex,
        fullName: r.fullName,
        phone: r.phone,
        normalizedPhone: r.normalizedPhone,
        email: r.email,
        gender: r.gender,
        ageGroup: r.ageGroup,
        area: r.area,
        churchRole: r.churchRole,
        fellowshipId: r.fellowshipId,
        fellowshipName: r.fellowshipName,
        isOnline: r.isOnline,
        isInternational: r.isInternational,
        status: r.status,
        issues: r.issues,
      }));

      return Either.right({ rows });
    } catch (err) {
      console.error('[MemberRepository.previewBulkImport]', err);
      return Either.left(new DataError('NetworkError', 'Bulk preview failed'));
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

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
    return /^\d{7,15}$/.test(cleaned) ? original : null;
  }

  private mapChurchRole(raw: string): string {
    const lower = raw?.toLowerCase()?.trim() ?? '';
    if (lower.includes('online')) return 'online_member';
    if (lower.includes('pastor')) return 'pastor';
    if (lower.includes('elder')) return 'elder';
    if (lower.includes('overseer')) return 'overseer';
    if (
      lower.includes('first-time') ||
      lower.includes('first time') ||
      lower.includes('visitor')
    )
      return 'first_time_visitor';
    if (lower.includes('regular')) return 'regular_attendee';
    return 'church_member';
  }

  private mapAgeGroup(raw: string): string {
    const lower = raw?.toLowerCase()?.trim() ?? '';
    if (
      lower.includes('under') ||
      (lower.includes('18') && lower.includes('under'))
    )
      return 'under_18';
    if (lower.includes('18') && lower.includes('25')) return '18_25';
    if (lower.includes('26') && lower.includes('35')) return '26_35';
    if (lower.includes('36') && lower.includes('50')) return '36_50';
    if (lower.includes('above') || lower.includes('50+')) return 'above_50';
    return '';
  }

  private mapGender(raw: string): string {
    const lower = raw?.toLowerCase()?.trim() ?? '';
    if (lower === 'male' || lower === 'm') return 'male';
    if (lower === 'female' || lower === 'f') return 'female';
    return '';
  }

  private isInternationalArea(area: string): boolean {
    if (!area?.trim()) return false;
    const lower = area.toLowerCase();
    return INTERNATIONAL_AREA_PATTERNS.some((re) => re.test(lower));
  }

  private matchFellowship(
    area: string,
    dbMap: Map<string, { id: string; name: string }>,
  ): { id: string | null; name: string } | null {
    if (!area?.trim()) return null;
    const lower = area.toLowerCase();
    for (const f of FELLOWSHIP_KEYWORDS) {
      if (f.keywords.some((kw) => lower.includes(kw))) {
        // Try to resolve UUID from DB
        const dbEntry = dbMap.get(f.name.toLowerCase());
        if (dbEntry) return dbEntry;
        // Fellowship not yet in DB — return name only, id null
        return { id: null, name: f.name };
      }
    }
    return null;
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
