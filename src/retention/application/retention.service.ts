import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import { MemberStatusHistoryEntity } from '../../members/infrastructure/member-status-history.entity';
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
    @InjectRepository(MemberStatusHistoryEntity)
    private readonly statusHistoryOrm: Repository<MemberStatusHistoryEntity>,
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
          'Share of members who started as a guest (30+ days ago) and have since had a recorded ' +
          'status change to member or leader. Based on member_status_history, tracked from when ' +
          'that table was introduced — members whose status changed before then have no history ' +
          "and won't appear in either count.",
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

  /**
   * True cohort-transition metric backed by member_status_history: "total" is
   * members who *started* as a guest (their first recorded status, from
   * member_status_history.from_status IS NULL) in the window, and old enough
   * for the 30-day conversion window to have elapsed; "converted" is how many
   * of those have since had a recorded transition to member/leader. Replaces
   * the old approximation, which only compared current status against join
   * date and couldn't tell a real guest conversion from a member created
   * directly as member/leader.
   */
  private async getGuestConversion(from?: string, to?: string) {
    const params: unknown[] = [];
    let dateFilter = '';
    if (from) {
      params.push(from);
      dateFilter += ` AND starts.started_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      dateFilter += ` AND starts.started_at <= $${params.length}`;
    }

    const [row] = await this.statusHistoryOrm.manager.query<
      Array<{ total: string; converted: string }>
    >(
      `
      WITH starts AS (
        SELECT member_id, changed_at AS started_at
        FROM member_status_history
        WHERE from_status IS NULL AND to_status = '${MemberStatus.GUEST}'
      )
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1 FROM member_status_history h
            WHERE h.member_id = starts.member_id
              AND h.to_status IN ('${MemberStatus.MEMBER}', '${MemberStatus.LEADER}')
              AND h.changed_at > starts.started_at
          )
        )::int AS converted
      FROM starts
      WHERE starts.started_at <= (CURRENT_DATE - INTERVAL '${GUEST_CONVERSION_WINDOW_DAYS} days')
      ${dateFilter}
      `,
      params,
    );

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

    // Each month's cohort is independent of the others, so run all 6 queries
    // concurrently instead of awaiting them one at a time in the loop — this
    // was previously the slowest part of getStats() despite each individual
    // query being cheap, since 6 round trips were paid serially.
    const months = Array.from({ length: TREND_MONTHS }, (_, idx) => {
      const i = TREND_MONTHS - 1 - idx;
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      return { monthStart, monthEnd };
    });

    return Promise.all(
      months.map(async ({ monthStart, monthEnd }) => {
        const from = monthStart.toISOString().slice(0, 10);
        const to = monthEnd.toISOString().slice(0, 10);
        const { eligible, rate } = await this.getCohortRetention(30, from, to);
        return {
          month: monthStart.toLocaleString('en-US', {
            month: 'short',
            year: 'numeric',
          }),
          eligible,
          // Distinguish "no cohort yet" (e.g. the current month, whose
          // members haven't reached the 30-day mark) from an eligible
          // cohort that genuinely retained 0% — the former should read as
          // a gap on the trend chart, not a 0% dip.
          rate: eligible > 0 ? rate : null,
        };
      }),
    );
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
           TO_CHAR(m.joined_at, 'YYYY-MM-DD') AS "joinedAt",
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
