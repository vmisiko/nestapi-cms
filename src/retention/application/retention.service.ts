import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import { AttendanceRecordEntity } from '../../attendance/infrastructure/attendance-record.entity';
import { AttendanceSessionEntity } from '../../attendance/infrastructure/attendance-session.entity';
import { FollowUpEntity } from '../../follow-ups/infrastructure/follow-up.entity';
import { DepartmentEntity } from '../../departments/infrastructure/department.entity';
import { FellowshipEntity } from '../../fellowships/infrastructure/fellowship.entity';
import { AttendanceStatus } from '../../attendance/domain/attendance-record';
import { ActivityStatus } from '../../core/domain/enums';
import { MemberStatus } from '../../members/domain/member';
import { FollowUpStatus } from '../../follow-ups/domain/follow-up';
import type { RetentionQueryDto } from '../presentation/dto/retention-query.dto';

const GUEST_CONVERSION_WINDOW_DAYS = 30;
const TREND_MONTHS = 6;

export interface CohortResult {
  eligible: number;
  retained: number;
  rate: number;
}

@Injectable()
export class RetentionService {
  constructor(
    @InjectRepository(MemberEntity)
    private readonly memberOrm: Repository<MemberEntity>,
    @InjectRepository(FollowUpEntity)
    private readonly followUpOrm: Repository<FollowUpEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departmentOrm: Repository<DepartmentEntity>,
    @InjectRepository(FellowshipEntity)
    private readonly fellowshipOrm: Repository<FellowshipEntity>,
  ) {}

  async getStats(query: RetentionQueryDto) {
    const [d30, d60, d90, guestConversion, followUpCompletion, trend] =
      await Promise.all([
        this.getCohortRetention(30, query.from, query.to),
        this.getCohortRetention(60, query.from, query.to),
        this.getCohortRetention(90, query.from, query.to),
        this.getGuestConversion(query.from, query.to),
        this.getFollowUpCompletion(query.from, query.to),
        this.getMonthlyTrend(),
      ]);

    const [departmentBreakdown, fellowshipBreakdown] = await Promise.all([
      query.departmentId
        ? this.getDepartmentBreakdown(query.departmentId)
        : undefined,
      query.fellowshipId
        ? this.getFellowshipBreakdown(query.fellowshipId)
        : undefined,
    ]);

    return {
      cohortRetention: { d30, d60, d90 },
      guestConversion: {
        ...guestConversion,
        note:
          'Approximation: share of members who joined 30+ days ago and currently have status ' +
          'member/leader. Member status has no change history, so members created directly as ' +
          'member/leader are indistinguishable from real guest conversions.',
      },
      followUpCompletion,
      trend,
      departmentBreakdown,
      fellowshipBreakdown,
    };
  }

  private async getCohortRetention(
    windowDays: number,
    from?: string,
    to?: string,
  ): Promise<CohortResult> {
    const qb = this.memberOrm
      .createQueryBuilder('m')
      .leftJoin(
        AttendanceRecordEntity,
        'r',
        'r.member_id = m.id AND r.status = :present',
        { present: AttendanceStatus.PRESENT },
      )
      .leftJoin(
        AttendanceSessionEntity,
        's',
        `s.id = r.session_id AND s.session_date BETWEEN m.joined_at AND (m.joined_at + INTERVAL '${windowDays} days')`,
      )
      .where(`m.joined_at <= (CURRENT_DATE - INTERVAL '${windowDays} days')`);

    if (from) qb.andWhere('m.joined_at >= :from', { from });
    if (to) qb.andWhere('m.joined_at <= :to', { to });

    const row = await qb
      .select('COUNT(DISTINCT m.id)', 'eligible')
      .addSelect(
        'COUNT(DISTINCT m.id) FILTER (WHERE s.id IS NOT NULL)',
        'retained',
      )
      .getRawOne<{ eligible: string; retained: string }>();

    const eligible = Number(row?.eligible ?? 0);
    const retained = Number(row?.retained ?? 0);
    return {
      eligible,
      retained,
      rate: eligible > 0 ? Math.round((retained / eligible) * 1000) / 10 : 0,
    };
  }

  private async getGuestConversion(from?: string, to?: string) {
    const qb = this.memberOrm
      .createQueryBuilder('m')
      .where(
        `m.joined_at <= (CURRENT_DATE - INTERVAL '${GUEST_CONVERSION_WINDOW_DAYS} days')`,
      );

    if (from) qb.andWhere('m.joined_at >= :from', { from });
    if (to) qb.andWhere('m.joined_at <= :to', { to });

    const row = await qb
      .select('COUNT(*)', 'total')
      .addSelect(
        'COUNT(*) FILTER (WHERE m.status IN (:...convertedStatuses))',
        'converted',
      )
      .setParameter('convertedStatuses', [
        MemberStatus.MEMBER,
        MemberStatus.LEADER,
      ])
      .getRawOne<{ total: string; converted: string }>();

    const total = Number(row?.total ?? 0);
    const converted = Number(row?.converted ?? 0);
    return {
      total,
      converted,
      rate: total > 0 ? Math.round((converted / total) * 1000) / 10 : 0,
    };
  }

  private async getFollowUpCompletion(from?: string, to?: string) {
    const qb = this.followUpOrm.createQueryBuilder('f');
    if (from) qb.andWhere('f.created_at >= :from', { from });
    if (to) qb.andWhere('f.created_at <= :to', { to });

    const row = await qb
      .select('COUNT(*)', 'total')
      .addSelect('COUNT(*) FILTER (WHERE f.status = :completed)', 'completed')
      .setParameter('completed', FollowUpStatus.COMPLETED)
      .getRawOne<{ total: string; completed: string }>();

    const total = Number(row?.total ?? 0);
    const completed = Number(row?.completed ?? 0);
    return {
      total,
      completed,
      rate: total > 0 ? Math.round((completed / total) * 1000) / 10 : 0,
    };
  }

  private async getMonthlyTrend() {
    const now = new Date();
    const points: { month: string; eligible: number; rate: number }[] = [];

    for (let i = TREND_MONTHS - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const from = monthStart.toISOString().slice(0, 10);
      const to = monthEnd.toISOString().slice(0, 10);

      const { eligible, rate } = await this.getCohortRetention(30, from, to);
      points.push({
        month: monthStart.toLocaleString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        eligible,
        rate,
      });
    }

    return points;
  }

  async getAtRiskMembers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const whereSql = `
      (
        m.activity_status = '${ActivityStatus.INACTIVE}'
        OR (
          m.status = '${MemberStatus.GUEST}'
          AND m.joined_at <= (CURRENT_DATE - INTERVAL '${GUEST_CONVERSION_WINDOW_DAYS} days')
          AND NOT EXISTS (
            SELECT 1 FROM attendance_records r
            WHERE r.member_id = m.id AND r.status = '${AttendanceStatus.PRESENT}'
          )
        )
      )
    `;

    const [rows, countRows] = await Promise.all([
      this.memberOrm.manager.query<
        Array<{
          id: string;
          firstName: string;
          lastName: string;
          status: string;
          activityStatus: string;
          joinedAt: string;
          reason: 'inactive' | 'stale_guest';
        }>
      >(
        `SELECT
           m.id,
           m.first_name AS "firstName",
           m.last_name AS "lastName",
           m.status,
           m.activity_status AS "activityStatus",
           m.joined_at AS "joinedAt",
           CASE WHEN m.activity_status = '${ActivityStatus.INACTIVE}' THEN 'inactive' ELSE 'stale_guest' END AS "reason"
         FROM members m
         WHERE ${whereSql}
         ORDER BY m.joined_at ASC
         LIMIT $1 OFFSET $2`,
        [limit, skip],
      ),
      this.memberOrm.manager.query<Array<{ count: number }>>(
        `SELECT COUNT(*)::int AS count FROM members m WHERE ${whereSql}`,
      ),
    ]);

    return { members: rows, total: countRows[0]?.count ?? 0, page, limit };
  }

  private async getDepartmentBreakdown(departmentId: string) {
    const rows = await this.departmentOrm
      .createQueryBuilder('d')
      .innerJoin('member_departments', 'md', 'md.department_id = d.id')
      .innerJoin(MemberEntity, 'm', 'm.id = md.member_id')
      .where('d.id = :departmentId', { departmentId })
      .select('d.id', 'id')
      .addSelect('d.name', 'name')
      .addSelect('COUNT(*)', 'memberCount')
      .addSelect(
        'COUNT(*) FILTER (WHERE m.activity_status = :active)',
        'activeCount',
      )
      .setParameter('active', ActivityStatus.ACTIVE)
      .groupBy('d.id, d.name')
      .getRawMany<{
        id: string;
        name: string;
        memberCount: string;
        activeCount: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      memberCount: Number(r.memberCount),
      activeCount: Number(r.activeCount),
    }));
  }

  private async getFellowshipBreakdown(fellowshipId: string) {
    const rows = await this.fellowshipOrm
      .createQueryBuilder('f')
      .innerJoin(MemberEntity, 'm', 'm.fellowship_id = f.id')
      .where('f.id = :fellowshipId', { fellowshipId })
      .select('f.id', 'id')
      .addSelect('f.name', 'name')
      .addSelect('COUNT(*)', 'memberCount')
      .addSelect(
        'COUNT(*) FILTER (WHERE m.activity_status = :active)',
        'activeCount',
      )
      .setParameter('active', ActivityStatus.ACTIVE)
      .groupBy('f.id, f.name')
      .getRawMany<{
        id: string;
        name: string;
        memberCount: string;
        activeCount: string;
      }>();

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      memberCount: Number(r.memberCount),
      activeCount: Number(r.activeCount),
    }));
  }
}
