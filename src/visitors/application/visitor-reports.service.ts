import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MemberEntity } from '../../members/infrastructure/member.entity';
import {
  BuiltFilter,
  TASK_STATUS_SQL,
  VISITORS_CTE,
  VisitorFilters,
  buildVisitorFilter,
} from './visitor-facts.sql';

export const REPORT_TYPES = [
  'first-time-visitors',
  'attendance',
  'cohort',
  'follow-up',
  'journey',
  'activity',
  'inactive',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export interface ReportColumn {
  key: string;
  label: string;
}
export type ReportCell = string | number | null;
export type ReportRow = Record<string, ReportCell>;

export interface ReportResult {
  type: ReportType;
  from: string;
  to: string;
  columns: ReportColumn[];
  /** At most `limit` rows; `total` is the full count. */
  rows: ReportRow[];
  total: number;
  summary: { label: string; value: number }[];
}

export type ReportFilters = VisitorFilters & { limit?: number };

const MAX_ROWS = 20000;
const DEFAULT_PREVIEW = 50;
const RETENTION_WEEKS = [1, 2, 3, 4];

const GENDER_LABELS: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  not_specified: 'Not specified',
};
const STAY_LABELS: Record<string, string> = {
  permanent: 'Permanent',
  temporary: 'Temporary',
};
const LIFECYCLE_LABELS: Record<string, string> = {
  new: 'New',
  returning: 'Returning',
  regular: 'Regular',
  inactive: 'Inactive',
  lost: 'Lost',
};
const TASK_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
  urgent: 'Urgent',
};
const SESSION_LABELS: Record<string, string> = {
  sunday_service: 'Sunday Service',
  midweek_service: 'Midweek Service',
  fellowship: 'Fellowship',
  special_event: 'Special Event',
};
const EVENT_LABELS: Record<string, string> = {
  registered: 'Registered',
  attended: 'Attended',
  follow_up_created: 'Follow-up created',
  contact_attempt: 'Contact attempt',
  follow_up_completed: 'Follow-up completed',
  status_changed: 'Status changed',
};

type Raw = Record<string, string | null>;

const genderKey = (value: string | null) =>
  value === 'male' || value === 'female' ? value : 'not_specified';

/** Facets used for the summary counts; underscore keys are not shown as columns. */
const facets = (r: Raw): ReportRow => ({
  _gender: genderKey(r.gender),
  _stay: r.stay_type ?? '',
  _lifecycle: r.lifecycle ?? '',
});

const visitorCells = (r: Raw): ReportRow => ({
  visitorId: r.id,
  name: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim(),
  phone: r.phone ?? '',
  gender: GENDER_LABELS[genderKey(r.gender)],
  stayType: STAY_LABELS[r.stay_type ?? ''] ?? '',
  status: LIFECYCLE_LABELS[r.lifecycle ?? ''] ?? '',
  ...facets(r),
});

interface Definition {
  columns: ReportColumn[];
  sql: string;
  params: unknown[];
  map: (r: Raw) => ReportRow;
  /** Extra summary lines computed from the full result. */
  extra?: (rows: ReportRow[]) => { label: string; value: number }[];
  /** Cohort and activity are aggregates, so the visitor breakdown does not apply. */
  aggregate?: (rows: ReportRow[]) => { label: string; value: number }[];
}

const countBy = (
  rows: ReportRow[],
  key: string,
  labels: Record<string, string>,
  skipZero = false,
) =>
  Object.keys(labels)
    .map((k) => ({
      label: labels[k],
      value: rows.filter((row) => row[key] === k).length,
    }))
    .filter((item) => !skipZero || item.value > 0);

/**
 * The report engine behind the Reports screens. Every report is built from the
 * same visitor definition (see visitor-facts.sql.ts) and the same four filters
 * (visitor status, gender, stay type, follow-up status), so the numbers agree
 * between reports.
 */
@Injectable()
export class VisitorReportsService {
  constructor(
    @InjectRepository(MemberEntity)
    private readonly memberOrm: Repository<MemberEntity>,
  ) {}

  async getReport(
    type: string,
    from: string,
    to: string,
    filters: ReportFilters,
  ): Promise<ReportResult> {
    if (!(REPORT_TYPES as readonly string[]).includes(type)) {
      throw new BadRequestException(`Unknown report "${type}"`);
    }
    const start = from.slice(0, 10);
    const end = to.slice(0, 10);
    if (start > end) {
      throw new BadRequestException('"from" must not be after "to"');
    }

    const definition = this.define(type as ReportType, filters);
    const raw = await this.memberOrm.manager.query<Raw[]>(
      `WITH ${VISITORS_CTE} ${definition.sql} LIMIT ${MAX_ROWS}`,
      [start, end, ...definition.params],
    );
    const rows = raw.map(definition.map);

    const limit = Math.min(filters.limit ?? DEFAULT_PREVIEW, MAX_ROWS);
    const summary = definition.aggregate
      ? definition.aggregate(rows)
      : [
          { label: 'Rows', value: rows.length },
          ...countBy(rows, '_gender', GENDER_LABELS),
          ...countBy(rows, '_stay', STAY_LABELS),
          ...countBy(rows, '_lifecycle', LIFECYCLE_LABELS, true),
          ...(definition.extra ? definition.extra(rows) : []),
        ];

    return {
      type: type as ReportType,
      from: start,
      to: end,
      columns: definition.columns,
      rows: rows.slice(0, limit),
      total: rows.length,
      summary,
    };
  }

  private define(type: ReportType, filters: ReportFilters): Definition {
    const filter = buildVisitorFilter(filters, 3);
    switch (type) {
      case 'first-time-visitors':
        return this.firstTime(filter);
      case 'attendance':
        return this.attendance(filter);
      case 'cohort':
        return this.cohort(filter);
      case 'follow-up':
        return this.followUp(filters);
      case 'journey':
        return this.journey(filter);
      case 'activity':
        return this.activity(filter);
      case 'inactive':
        return this.inactive(filter);
    }
  }

  private firstTime(f: BuiltFilter): Definition {
    return {
      columns: [
        { key: 'registered', label: 'Registered' },
        { key: 'visitorId', label: 'Visitor ID' },
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'gender', label: 'Gender' },
        { key: 'stayType', label: 'Stay type' },
        { key: 'status', label: 'Status' },
      ],
      sql: `
        SELECT v.*, to_char(v.joined_at, 'YYYY-MM-DD') AS registered
        FROM visitors v
        WHERE v.joined_at BETWEEN $1 AND $2 ${f.sql}
        ORDER BY v.joined_at, v.last_name, v.first_name`,
      params: f.params,
      map: (r) => ({ registered: r.registered, ...visitorCells(r) }),
    };
  }

  private attendance(f: BuiltFilter): Definition {
    return {
      columns: [
        { key: 'date', label: 'Attendance date' },
        { key: 'activity', label: 'Activity' },
        { key: 'activityId', label: 'Activity ID' },
        { key: 'visitorId', label: 'Visitor ID' },
        { key: 'name', label: 'Name' },
        { key: 'status', label: 'Status' },
      ],
      sql: `
        SELECT v.*, to_char(s.session_date, 'YYYY-MM-DD') AS d,
               s.session_type, s.id AS session_id
        FROM attendance_records r
        JOIN attendance_sessions s ON s.id = r.session_id
        JOIN visitors v ON v.id = r.member_id
        WHERE r.status = 'present' AND s.session_date BETWEEN $1 AND $2 ${f.sql}
        ORDER BY s.session_date, v.last_name, v.first_name`,
      params: f.params,
      map: (r) => ({
        ...visitorCells(r),
        date: r.d,
        activity: SESSION_LABELS[r.session_type ?? ''] ?? r.session_type,
        activityId: r.session_id,
        _activity: SESSION_LABELS[r.session_type ?? ''] ?? r.session_type,
      }),
      extra: (rows) => {
        const names = [...new Set(rows.map((row) => String(row._activity)))];
        return names.map((name) => ({
          label: name,
          value: rows.filter((row) => row._activity === name).length,
        }));
      },
    };
  }

  private cohort(f: BuiltFilter): Definition {
    const weekSql = RETENTION_WEEKS.map(
      (n) => `
        COUNT(*) FILTER (WHERE v.joined_at + ${n * 7} <= CURRENT_DATE) AS e${n},
        COUNT(*) FILTER (WHERE v.joined_at + ${n * 7} <= CURRENT_DATE AND EXISTS (
          SELECT 1 FROM attendance_records r
          JOIN attendance_sessions s ON s.id = r.session_id
          WHERE r.member_id = v.id AND r.status = 'present'
            AND s.session_date > v.joined_at + ${(n - 1) * 7}
            AND s.session_date <= v.joined_at + ${n * 7}
        )) AS r${n}`,
    ).join(',');
    return {
      columns: [
        { key: 'cohort', label: 'Cohort' },
        { key: 'start', label: 'Start' },
        { key: 'end', label: 'End' },
        { key: 'visitors', label: 'Visitors' },
        ...RETENTION_WEEKS.map((n) => ({
          key: `week${n}`,
          label: `Week ${n}`,
        })),
      ],
      // A cohort is a calendar month of first visits. It is tracked until four
      // weeks after the month ends, so every member's week-4 window is complete.
      sql: `
        SELECT to_char(date_trunc('month', v.joined_at), 'FMMonth') AS month_name,
               to_char(date_trunc('month', v.joined_at), 'YYYY-MM-DD') AS start_d,
               to_char(date_trunc('month', v.joined_at) + interval '1 month' + interval '27 days', 'YYYY-MM-DD') AS end_d,
               COUNT(*) AS visitors, ${weekSql}
        FROM visitors v
        WHERE v.joined_at BETWEEN $1 AND $2 ${f.sql}
        GROUP BY date_trunc('month', v.joined_at)
        ORDER BY date_trunc('month', v.joined_at)`,
      params: f.params,
      map: (r) => {
        const row: ReportRow = {
          cohort: `${r.month_name} Cohort`,
          start: r.start_d,
          end: r.end_d,
          visitors: Number(r.visitors),
        };
        for (const n of RETENTION_WEEKS) {
          const eligible = Number(r[`e${n}`]);
          const returned = Number(r[`r${n}`]);
          row[`week${n}`] =
            eligible > 0
              ? `${Math.round((returned / eligible) * 1000) / 10}% (${returned} of ${eligible})`
              : 'Not yet available';
        }
        return row;
      },
      aggregate: (rows) => [
        { label: 'Rows', value: rows.length },
        {
          label: 'Matching visitors',
          value: rows.reduce((sum, row) => sum + Number(row.visitors), 0),
        },
      ],
    };
  }

  private followUp(filters: ReportFilters): Definition {
    // The follow-up status filter applies to the task itself here, not "has any task".
    const f = buildVisitorFilter(filters, 3, { skipFollowUp: true });
    const params = [...f.params];
    let taskCondition = '';
    if (filters.followUpStatus) {
      params.push(filters.followUpStatus);
      taskCondition = ` AND (${TASK_STATUS_SQL}) = $${2 + params.length}`;
    }
    return {
      columns: [
        { key: 'dueDate', label: 'Due date' },
        { key: 'taskStatus', label: 'Status' },
        { key: 'priority', label: 'Priority' },
        { key: 'visitorId', label: 'Visitor ID' },
        { key: 'name', label: 'Name' },
        { key: 'worker', label: 'Assigned worker' },
        { key: 'created', label: 'Created' },
        { key: 'completed', label: 'Completed' },
      ],
      sql: `
        SELECT v.*, to_char(t.due_date, 'YYYY-MM-DD') AS due,
               (${TASK_STATUS_SQL}) AS task_status, t.priority,
               to_char(t.created_at, 'YYYY-MM-DD') AS created,
               to_char(t.completed_at, 'YYYY-MM-DD') AS completed,
               u.email AS worker
        FROM follow_up_tasks t
        JOIN visitors v ON v.id = t.member_id
        LEFT JOIN users u ON u.id = t.owner_id
        WHERE (t.due_date BETWEEN $1 AND $2
               OR t.created_at::date BETWEEN $1 AND $2
               OR t.completed_at::date BETWEEN $1 AND $2)
          ${f.sql}${taskCondition}
        ORDER BY t.due_date, v.last_name, v.first_name`,
      params,
      map: (r) => ({
        ...visitorCells(r),
        dueDate: r.due,
        taskStatus: TASK_STATUS_LABELS[r.task_status ?? ''] ?? r.task_status,
        priority: PRIORITY_LABELS[r.priority ?? ''] ?? r.priority,
        worker: r.worker ?? 'Unassigned',
        created: r.created,
        completed: r.completed ?? '',
        _taskStatus: r.task_status,
        _priority: r.priority,
      }),
      extra: (rows) => [
        ...countBy(rows, '_taskStatus', TASK_STATUS_LABELS),
        ...countBy(rows, '_priority', PRIORITY_LABELS, true),
      ],
    };
  }

  private journey(f: BuiltFilter): Definition {
    const cols = `v.id AS id, v.first_name, v.last_name, v.gender, v.stay_type, v.lifecycle`;
    return {
      columns: [
        { key: 'date', label: 'Event date' },
        { key: 'visitorId', label: 'Visitor ID' },
        { key: 'name', label: 'Name' },
        { key: 'event', label: 'Event' },
        { key: 'detail', label: 'Detail' },
      ],
      // The journey is read from the records the CMS already keeps, so it is
      // complete for existing visitors too and cannot fall out of step with them.
      sql: `
        SELECT e.*, to_char(e.d, 'YYYY-MM-DD') AS date_text FROM (
          SELECT v.joined_at AS d, 'registered' AS kind, ''::text AS detail, ${cols}
            FROM visitors v WHERE true ${f.sql}
          UNION ALL
          SELECT s.session_date, 'attended', s.title, ${cols}
            FROM attendance_records r
            JOIN attendance_sessions s ON s.id = r.session_id
            JOIN visitors v ON v.id = r.member_id
            WHERE r.status = 'present' ${f.sql}
          UNION ALL
          SELECT t.created_at::date, 'follow_up_created', t.title, ${cols}
            FROM follow_up_tasks t JOIN visitors v ON v.id = t.member_id
            WHERE true ${f.sql}
          UNION ALL
          SELECT a.contacted_at::date, 'contact_attempt',
                 a.contact_method::text || ' · ' || a.outcome::text, ${cols}
            FROM follow_up_attempts a
            JOIN follow_up_tasks t ON t.id = a.task_id
            JOIN visitors v ON v.id = t.member_id
            WHERE true ${f.sql}
          UNION ALL
          SELECT t.completed_at::date, 'follow_up_completed', t.title, ${cols}
            FROM follow_up_tasks t JOIN visitors v ON v.id = t.member_id
            WHERE t.completed_at IS NOT NULL ${f.sql}
          UNION ALL
          SELECT h.changed_at::date, 'status_changed',
                 h.from_status::text || ' → ' || h.to_status::text, ${cols}
            FROM member_status_history h JOIN visitors v ON v.id = h.member_id
            WHERE h.from_status IS NOT NULL ${f.sql}
        ) e
        WHERE e.d BETWEEN $1 AND $2
        ORDER BY e.d, e.last_name, e.first_name`,
      params: f.params,
      map: (r) => ({
        ...visitorCells(r),
        date: r.date_text,
        event: EVENT_LABELS[r.kind ?? ''] ?? r.kind,
        detail: r.detail ?? '',
        _event: r.kind,
      }),
      extra: (rows) => countBy(rows, '_event', EVENT_LABELS, true),
    };
  }

  private activity(f: BuiltFilter): Definition {
    return {
      columns: [
        { key: 'activity', label: 'Activity' },
        { key: 'firstTime', label: 'First-time visitors' },
        { key: 'attendance', label: 'Attendance' },
      ],
      sql: `
        SELECT s.session_type,
               COUNT(*) AS attendance,
               COUNT(DISTINCT r.member_id) FILTER (WHERE v.joined_at BETWEEN $1 AND $2) AS first_time
        FROM attendance_records r
        JOIN attendance_sessions s ON s.id = r.session_id
        JOIN visitors v ON v.id = r.member_id
        WHERE r.status = 'present' AND s.session_date BETWEEN $1 AND $2 ${f.sql}
        GROUP BY s.session_type
        ORDER BY s.session_type`,
      params: f.params,
      map: (r) => ({
        activity: SESSION_LABELS[r.session_type ?? ''] ?? r.session_type,
        firstTime: Number(r.first_time),
        attendance: Number(r.attendance),
      }),
      aggregate: (rows) => [
        { label: 'Rows', value: rows.length },
        {
          label: 'Attendance',
          value: rows.reduce((sum, row) => sum + Number(row.attendance), 0),
        },
      ],
    };
  }

  private inactive(f: BuiltFilter): Definition {
    return {
      columns: [
        { key: 'lastAttendance', label: 'Last attendance' },
        { key: 'visitorId', label: 'Visitor ID' },
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'gender', label: 'Gender' },
        { key: 'stayType', label: 'Stay type' },
        { key: 'status', label: 'Status' },
      ],
      // "Last attendance" falls back to the registration date for visitors who never attended.
      sql: `
        SELECT v.*, to_char(COALESCE(v.last_attended, v.joined_at), 'YYYY-MM-DD') AS last_seen
        FROM visitors v
        WHERE v.lifecycle IN ('inactive', 'lost')
          AND COALESCE(v.last_attended, v.joined_at) BETWEEN $1 AND $2 ${f.sql}
        ORDER BY COALESCE(v.last_attended, v.joined_at), v.last_name, v.first_name`,
      params: f.params,
      map: (r) => ({ lastAttendance: r.last_seen, ...visitorCells(r) }),
    };
  }
}
