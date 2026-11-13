import { ActivityStatus } from '../../core/domain/enums';
import { AttendanceStatus } from '../../attendance/domain/attendance-record';
import { MemberStatus } from '../../members/domain/member';

export type Lifecycle = 'new' | 'returning' | 'regular' | 'inactive' | 'lost';
export type GenderFilter = 'male' | 'female' | 'not_specified';
export type StayFilter = 'permanent' | 'temporary';
export type FollowUpFilter =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export const LIFECYCLES: Lifecycle[] = [
  'new',
  'returning',
  'regular',
  'inactive',
  'lost',
];
export const GENDER_FILTERS: GenderFilter[] = [
  'male',
  'female',
  'not_specified',
];
export const STAY_FILTERS: StayFilter[] = ['permanent', 'temporary'];
export const FOLLOW_UP_FILTERS: FollowUpFilter[] = [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
];

export interface VisitorFilters {
  visitorStatus?: Lifecycle;
  gender?: GenderFilter;
  stayType?: StayFilter;
  followUpStatus?: FollowUpFilter;
}

/**
 * A "visitor" is a member whose status is `guest`. Their lifecycle status is
 * derived, never stored, so it can never drift from the attendance records:
 *
 * - lost:      marked inactive and nothing seen for 90+ days
 *              (last present attendance, or the registration date if they never attended)
 * - inactive:  marked inactive (the existing member activity status)
 * - regular:   active and present at 3+ sessions in the last 8 weeks
 * - returning: active and present at 2+ sessions overall
 * - new:       everyone else (first visit only)
 *
 * Used as a CTE prefix: `WITH ${VISITORS_CTE} SELECT ... FROM visitors v`.
 */
export const VISITORS_CTE = `
  facts AS (
    SELECT m.id, m.first_name, m.last_name, m.phone, m.gender, m.stay_type,
           m.activity_status, m.joined_at,
           COUNT(r.id) FILTER (WHERE r.status = '${AttendanceStatus.PRESENT}') AS present_total,
           COUNT(r.id) FILTER (WHERE r.status = '${AttendanceStatus.PRESENT}'
                                 AND s.session_date >= CURRENT_DATE - 56) AS present_recent,
           MAX(s.session_date) FILTER (WHERE r.status = '${AttendanceStatus.PRESENT}') AS last_attended
    FROM members m
    LEFT JOIN attendance_records r ON r.member_id = m.id
    LEFT JOIN attendance_sessions s ON s.id = r.session_id
    WHERE m.status = '${MemberStatus.GUEST}'
    GROUP BY m.id
  ),
  visitors AS (
    SELECT f.*,
      CASE
        WHEN f.activity_status = '${ActivityStatus.INACTIVE}'
             AND COALESCE(f.last_attended, f.joined_at) < CURRENT_DATE - 90 THEN 'lost'
        WHEN f.activity_status = '${ActivityStatus.INACTIVE}' THEN 'inactive'
        WHEN f.present_recent >= 3 THEN 'regular'
        WHEN f.present_total >= 2 THEN 'returning'
        ELSE 'new'
      END AS lifecycle
    FROM facts f
  )`;

/** Follow-up status of a single task, with `t` as the task alias. */
export const TASK_STATUS_SQL = `
  CASE
    WHEN t.status = 'completed' THEN 'completed'
    WHEN t.status = 'cancelled' THEN 'cancelled'
    WHEN EXISTS (SELECT 1 FROM follow_up_attempts a WHERE a.task_id = t.id) THEN 'in_progress'
    ELSE 'pending'
  END`;

export interface BuiltFilter {
  /** Starts with " AND " (or is empty) so it can be appended to a WHERE clause. */
  sql: string;
  params: unknown[];
}

/**
 * Builds the shared report filters against the `visitors` CTE aliased `v`.
 * `firstParam` is the next free $n. Only values from the fixed lists above reach
 * the SQL text; everything else is bound as a parameter.
 */
export function buildVisitorFilter(
  filters: VisitorFilters,
  firstParam: number,
  options: { skipFollowUp?: boolean } = {},
): BuiltFilter {
  const parts: string[] = [];
  const params: unknown[] = [];
  const bind = (value: unknown) => {
    params.push(value);
    return `$${firstParam + params.length - 1}`;
  };

  if (filters.visitorStatus) {
    parts.push(`v.lifecycle = ${bind(filters.visitorStatus)}`);
  }
  if (filters.gender === 'not_specified') {
    parts.push(`(v.gender IS NULL OR v.gender NOT IN ('male', 'female'))`);
  } else if (filters.gender) {
    parts.push(`v.gender = ${bind(filters.gender)}`);
  }
  if (filters.stayType) {
    parts.push(`v.stay_type = ${bind(filters.stayType)}`);
  }
  if (filters.followUpStatus && !options.skipFollowUp) {
    parts.push(`EXISTS (
      SELECT 1 FROM follow_up_tasks t
      WHERE t.member_id = v.id AND (${TASK_STATUS_SQL}) = ${bind(filters.followUpStatus)}
    )`);
  }

  return {
    sql: parts.length ? ` AND ${parts.join(' AND ')}` : '',
    params,
  };
}
