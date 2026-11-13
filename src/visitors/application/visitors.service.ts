import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import { AttendanceStatus } from '../../attendance/domain/attendance-record';
import { ActivityStatus } from '../../core/domain/enums';
import { MemberStatus } from '../../members/domain/member';
import {
  FollowUpSource,
  FollowUpStatus,
} from '../../follow-ups/domain/follow-up';
import {
  VISITORS_CTE,
  VisitorFilters,
  buildVisitorFilter,
} from './visitor-facts.sql';

const RETENTION_WEEKS = [1, 2, 3, 4];

export interface RetentionWindow {
  week: number;
  eligible: number;
  returned: number;
  /** Percentage 0-100, or null while the window has not finished for anyone. */
  rate: number | null;
  available: boolean;
}

export type RetentionStatus = 'returned' | 'not_returned' | 'unavailable';

export interface RetentionReportRow {
  memberId: string;
  name: string;
  phone: string | null;
  firstVisit: string;
  weeks: { week: number; status: RetentionStatus }[];
}

export interface RetentionReport {
  from: string;
  to: string;
  summary: RetentionWindow[];
  rows: RetentionReportRow[];
}

export interface VisitorOverview {
  from: string;
  to: string;
  totalVisitors: number;
  firstTimeVisitors: number;
  returningVisitors: number;
  totalAttendance: number;
  activeVisitors: number;
  inactiveVisitors: number;
  followUpsDue: number;
  followUpsOverdue: number;
  retention: RetentionWindow[];
}

/**
 * Definitions (kept in one place so the numbers are explainable):
 * - A visitor is a member whose status is `guest`.
 * - First-time: a guest whose joined_at falls inside the range.
 * - Returning: a guest who joined before the range and was marked present in it.
 * - Total visitors = first-time + returning. Attendance counts `present` records
 *   of guests whose session date is inside the range.
 * - A first-time follow-up task is an open task for a guest, or one created by
 *   the new-visitor automation. "Due" = due date inside the range; "overdue" is
 *   the subset already before today.
 * - Retention week N: of first-time visitors in the range whose Nth week has
 *   ended, the share present in days 7(N-1)+1..7N after their first visit. A
 *   week nobody has finished yet is `available: false`, never 0%.
 */
@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(MemberEntity)
    private readonly memberOrm: Repository<MemberEntity>,
  ) {}

  async getOverview(from: string, to: string): Promise<VisitorOverview> {
    const start = from.slice(0, 10);
    const end = to.slice(0, 10);
    if (start > end) {
      throw new BadRequestException('"from" must not be after "to"');
    }

    const [counts] = await this.memberOrm.manager.query<
      Record<string, string>[]
    >(
      `
      WITH first_time AS (
        SELECT id, activity_status FROM members
        WHERE status = $3 AND joined_at BETWEEN $1 AND $2
      ),
      returning_visitors AS (
        SELECT DISTINCT m.id, m.activity_status
        FROM members m
        JOIN attendance_records r ON r.member_id = m.id AND r.status = $4
        JOIN attendance_sessions s ON s.id = r.session_id
          AND s.session_date BETWEEN $1 AND $2
        WHERE m.status = $3 AND m.joined_at < $1
      ),
      visitors AS (
        SELECT * FROM first_time UNION SELECT * FROM returning_visitors
      ),
      tasks AS (
        SELECT f.due_date FROM follow_up_tasks f
        JOIN members m ON m.id = f.member_id
        WHERE f.status = $7
          AND (m.status = $3 OR f.source = $8)
          AND f.due_date BETWEEN $1 AND $2
      )
      SELECT
        (SELECT COUNT(*) FROM first_time) AS first_time,
        (SELECT COUNT(*) FROM returning_visitors) AS returning_count,
        (SELECT COUNT(*) FROM visitors) AS total,
        (SELECT COUNT(*) FROM visitors WHERE activity_status = $5) AS active,
        (SELECT COUNT(*) FROM visitors WHERE activity_status = $6) AS inactive,
        (SELECT COUNT(*) FROM attendance_records r
           JOIN attendance_sessions s ON s.id = r.session_id
           JOIN members m ON m.id = r.member_id
          WHERE r.status = $4 AND m.status = $3
            AND s.session_date BETWEEN $1 AND $2) AS attendance,
        (SELECT COUNT(*) FROM tasks) AS due,
        (SELECT COUNT(*) FROM tasks WHERE due_date < CURRENT_DATE) AS overdue
      `,
      [
        start,
        end,
        MemberStatus.GUEST,
        AttendanceStatus.PRESENT,
        ActivityStatus.ACTIVE,
        ActivityStatus.INACTIVE,
        FollowUpStatus.OPEN,
        FollowUpSource.VISITOR_AUTOMATION,
      ],
    );

    const retention = await Promise.all(
      RETENTION_WEEKS.map((week) => this.getRetentionWindow(week, start, end)),
    );

    return {
      from: start,
      to: end,
      totalVisitors: Number(counts.total),
      firstTimeVisitors: Number(counts.first_time),
      returningVisitors: Number(counts.returning_count),
      totalAttendance: Number(counts.attendance),
      activeVisitors: Number(counts.active),
      inactiveVisitors: Number(counts.inactive),
      followUpsDue: Number(counts.due),
      followUpsOverdue: Number(counts.overdue),
      retention,
    };
  }

  /**
   * Per-visitor retention for first-time visitors in the range: for each of
   * weeks 1-4, did they return, not return, or is that week still in progress.
   * The summary is derived from the same rows, so it always matches the table.
   */
  async getRetentionReport(
    from: string,
    to: string,
    filters: VisitorFilters = {},
  ): Promise<RetentionReport> {
    const start = from.slice(0, 10);
    const end = to.slice(0, 10);
    if (start > end) {
      throw new BadRequestException('"from" must not be after "to"');
    }

    const filter = buildVisitorFilter(filters, 3);
    // The week numbers are internal constants, never user input.
    const weekColumns = RETENTION_WEEKS.map(
      (n) => `
        CASE
          WHEN v.joined_at + ${n * 7} > CURRENT_DATE THEN 'unavailable'
          WHEN EXISTS (
            SELECT 1 FROM attendance_records r
            JOIN attendance_sessions s ON s.id = r.session_id
            WHERE r.member_id = v.id AND r.status = '${AttendanceStatus.PRESENT}'
              AND s.session_date > v.joined_at + ${(n - 1) * 7}
              AND s.session_date <= v.joined_at + ${n * 7}
          ) THEN 'returned'
          ELSE 'not_returned'
        END AS w${n}`,
    ).join(',');

    const raw = await this.memberOrm.manager.query<Record<string, string>[]>(
      `
      WITH ${VISITORS_CTE}
      SELECT v.id, v.first_name, v.last_name, v.phone,
             to_char(v.joined_at, 'YYYY-MM-DD') AS first_visit,
             ${weekColumns}
      FROM visitors v
      WHERE v.joined_at BETWEEN $1 AND $2 ${filter.sql}
      ORDER BY v.joined_at, v.last_name, v.first_name
      `,
      [start, end, ...filter.params],
    );

    const rows: RetentionReportRow[] = raw.map((r) => ({
      memberId: r.id,
      name: `${r.first_name} ${r.last_name}`.trim(),
      phone: r.phone ?? null,
      firstVisit: r.first_visit,
      weeks: RETENTION_WEEKS.map((week) => ({
        week,
        status: r[`w${week}`] as RetentionStatus,
      })),
    }));

    const summary = RETENTION_WEEKS.map((week) => {
      const statuses = rows.map((r) => r.weeks[week - 1].status);
      const eligible = statuses.filter((v) => v !== 'unavailable').length;
      const returned = statuses.filter((v) => v === 'returned').length;
      return {
        week,
        eligible,
        returned,
        rate:
          eligible > 0 ? Math.round((returned / eligible) * 1000) / 10 : null,
        available: eligible > 0,
      };
    });

    return { from: start, to: end, summary, rows };
  }

  private async getRetentionWindow(
    week: number,
    from: string,
    to: string,
  ): Promise<RetentionWindow> {
    const [row] = await this.memberOrm.manager.query<Record<string, string>[]>(
      `
      SELECT
        COUNT(*) AS eligible,
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM attendance_records r
          JOIN attendance_sessions s ON s.id = r.session_id
          WHERE r.member_id = m.id AND r.status = $5
            AND s.session_date > m.joined_at + ($4::int - 1) * 7
            AND s.session_date <= m.joined_at + $4::int * 7
        )) AS returned
      FROM members m
      WHERE m.status = $3
        AND m.joined_at BETWEEN $1 AND $2
        AND m.joined_at + $4::int * 7 <= CURRENT_DATE
      `,
      [from, to, MemberStatus.GUEST, week, AttendanceStatus.PRESENT],
    );

    const eligible = Number(row.eligible);
    const returned = Number(row.returned);
    return {
      week,
      eligible,
      returned,
      rate: eligible > 0 ? Math.round((returned / eligible) * 1000) / 10 : null,
      available: eligible > 0,
    };
  }
}
