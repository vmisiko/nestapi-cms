/**
 * Bulk data generator for performance testing (B9), not for the board demo.
 *
 *   DATABASE_URL=... npm run seed:load-test -- --count=5000
 *
 * Generates --count members plus proportional attendance, follow-up, and
 * messaging rows, using fast bulk inserts (no per-row realism effort — this
 * is for measuring query performance at scale, not for a demo audience).
 *
 * Safety, same shape as seed-demo.ts:
 *  - refuses to run when NODE_ENV=production
 *  - refuses a non-local DATABASE_URL unless --allow-remote is passed
 *  - everything happens in one transaction
 *
 * This does not dedupe or mark rows for `--reset` the way seed-demo.ts does —
 * it's meant to run once against a throwaway database (e.g. a disposable
 * Docker Postgres container), not against the shared local dev database.
 */
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../src/data-source';

dotenv.config();

type Query = (sql: string, params?: unknown[]) => Promise<any[]>;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(90210);
const chance = (p: number) => rand() < p;
const int = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];

const DAY = 86_400_000;
const today = new Date();
today.setUTCHours(12, 0, 0, 0);
const daysAgo = (n: number) => new Date(today.getTime() - n * DAY);
const iso = (d: Date) => d.toISOString().slice(0, 10);

async function insertRows(
  q: Query,
  table: string,
  cols: string[],
  rows: unknown[][],
) {
  const CHUNK = 1000;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const params: unknown[] = [];
    const values = rows
      .slice(i, i + CHUNK)
      .map(
        (row) =>
          '(' +
          row
            .map((v) => {
              params.push(v);
              return `$${params.length}`;
            })
            .join(',') +
          ')',
      )
      .join(',');
    await q(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES ${values}`,
      params,
    );
  }
}

const STATUSES = ['guest', 'member', 'leader'] as const;
const ACTIVITY = ['active', 'inactive'] as const;
const CONTACT_METHODS = ['call', 'sms', 'visit', 'email'] as const;

async function seed(q: Query, memberCount: number) {
  console.time('total');

  const [admin] = (await q(`SELECT id FROM users LIMIT 1`)) as Array<{
    id: string;
  }>;
  if (!admin) throw new Error('No user found. Run seed:admin first.');
  const adminId = admin.id;

  // ---- a handful of fellowships to spread members across
  const fellowshipCount = 20;
  const zoneRows = [['z1', 'Load Test Zone']];
  const zoneId = randomUUID();
  await insertRows(q, 'fellowship_zones', ['id', 'name'], [
    [zoneId, 'Load Test Zone'],
  ]);
  void zoneRows;

  const fellowshipIds: string[] = [];
  const fellowshipRows: unknown[][] = [];
  for (let i = 0; i < fellowshipCount; i++) {
    const id = randomUUID();
    fellowshipIds.push(id);
    fellowshipRows.push([
      id,
      `Load Test Fellowship ${i}`,
      `load-test-fellowship-${i}`,
      zoneId,
      'Tuesday',
      '18:00',
      'Load test location',
      'active',
      'load-test-seed',
    ]);
  }
  await insertRows(
    q,
    'fellowships',
    [
      'id',
      'name',
      'slug',
      'zone_id',
      'meeting_day',
      'meeting_time',
      'location',
      'status',
      'description',
    ],
    fellowshipRows,
  );

  // ---- members
  console.time('members insert');
  interface M {
    id: string;
    status: (typeof STATUSES)[number];
    activity: (typeof ACTIVITY)[number];
    joinedDaysAgo: number;
    fellowshipId: string;
  }
  const members: M[] = [];
  const memberRows: unknown[][] = [];
  for (let i = 0; i < memberCount; i++) {
    const joinedDaysAgo = int(1, 700);
    const status = pick(STATUSES);
    const activity: M['activity'] = chance(0.12) ? 'inactive' : 'active';
    const id = randomUUID();
    const fellowshipId = pick(fellowshipIds);
    members.push({ id, status, activity, joinedDaysAgo, fellowshipId });
    memberRows.push([
      id,
      `First${i}`,
      `Last${i}`,
      `+254700${String(i).padStart(6, '0')}`,
      `loadtest.${i}@loadtest.example`,
      status,
      fellowshipId,
      chance(0.08) ? 'child' : 'adult',
      activity,
      iso(daysAgo(joinedDaysAgo)),
    ]);
  }
  await insertRows(
    q,
    'members',
    [
      'id',
      'first_name',
      'last_name',
      'phone',
      'email',
      'status',
      'fellowship_id',
      'member_type',
      'activity_status',
      'joined_at',
    ],
    memberRows,
  );
  console.timeEnd('members insert');

  // ---- departments
  const deptIds: string[] = [];
  const deptRows: unknown[][] = [];
  for (let i = 0; i < 8; i++) {
    const id = randomUUID();
    deptIds.push(id);
    deptRows.push([id, `Load Test Dept ${i}`, null, 20, 'load-test-seed']);
  }
  await insertRows(
    q,
    'departments',
    ['id', 'name', 'head_id', 'member_target', 'description'],
    deptRows,
  );
  const memberDeptRows: unknown[][] = [];
  for (const m of members) {
    if (chance(0.6)) memberDeptRows.push([m.id, pick(deptIds)]);
  }
  await insertRows(
    q,
    'member_departments',
    ['member_id', 'department_id'],
    memberDeptRows,
  );

  // ---- 14 attendance sessions x every member (matches seed-demo.ts's shape)
  console.time('attendance insert');
  const sessions: Array<{ id: string; date: Date }> = [];
  const lastSunday = new Date(today);
  lastSunday.setUTCDate(lastSunday.getUTCDate() - lastSunday.getUTCDay());
  for (let w = 0; w < 14; w++) {
    sessions.push({
      id: randomUUID(),
      date: new Date(lastSunday.getTime() - w * 7 * DAY),
    });
  }
  await insertRows(
    q,
    'attendance_sessions',
    ['id', 'title', 'session_type', 'session_date', 'notes'],
    sessions.map((s) => [
      s.id,
      `Load Test Session ${iso(s.date)}`,
      'sunday_service',
      iso(s.date),
      'load-test-seed',
    ]),
  );
  const recordRows: unknown[][] = [];
  for (const s of sessions) {
    for (const m of members) {
      const joinedAt = daysAgo(m.joinedDaysAgo);
      if (joinedAt > s.date) continue;
      const p = m.activity === 'inactive' ? 0.05 : 0.7;
      if (chance(p)) {
        recordRows.push([s.id, m.id, 'present', s.date.toISOString()]);
      } else {
        recordRows.push([s.id, m.id, 'absent', null]);
      }
    }
  }
  await insertRows(
    q,
    'attendance_records',
    ['session_id', 'member_id', 'status', 'checked_in_at'],
    recordRows,
  );
  console.timeEnd('attendance insert');

  // ---- follow-up tasks (open + completed) for a slice of members
  console.time('follow-ups insert');
  const taskRows: unknown[][] = [];
  const attemptRows: unknown[][] = [];
  for (const m of members) {
    if (m.activity !== 'inactive' && m.status !== 'guest') continue;
    if (!chance(0.7)) continue;
    const id = randomUUID();
    const completed = chance(0.5);
    taskRows.push([
      id,
      m.id,
      chance(0.5) ? adminId : null,
      `Follow up — load test member`,
      iso(daysAgo(int(0, 30))),
      completed ? 'completed' : 'open',
      completed ? new Date().toISOString() : null,
      'manual',
    ]);
    if (chance(0.4)) {
      attemptRows.push([
        randomUUID(),
        id,
        pick(CONTACT_METHODS),
        'no_answer',
        daysAgo(int(0, 10)).toISOString(),
        adminId,
      ]);
    }
  }
  await insertRows(
    q,
    'follow_up_tasks',
    [
      'id',
      'member_id',
      'owner_id',
      'title',
      'due_date',
      'status',
      'completed_at',
      'source',
    ],
    taskRows,
  );
  await insertRows(
    q,
    'follow_up_attempts',
    ['id', 'task_id', 'contact_method', 'outcome', 'contacted_at', 'created_by_id'],
    attemptRows,
  );
  console.timeEnd('follow-ups insert');

  // ---- one large message campaign delivered to every member
  console.time('messaging insert');
  const messageId = randomUUID();
  await insertRows(
    q,
    'messages',
    [
      'id',
      'title',
      'body',
      'type',
      'target_group',
      'status',
      'sent_at',
      'created_by',
    ],
    [
      [
        messageId,
        'Load Test Campaign',
        'Load test message body.',
        'announcement',
        'all',
        'sent',
        new Date().toISOString(),
        adminId,
      ],
    ],
  );
  const deliveryRows = members.map((m) => [
    randomUUID(),
    messageId,
    m.id,
    'Load Test Member',
    '+254700000000',
    'Load test message body.',
    chance(0.9) ? 'delivered' : 'failed',
    new Date().toISOString(),
    new Date().toISOString(),
    null,
  ]);
  await insertRows(
    q,
    'message_deliveries',
    [
      'id',
      'message_id',
      'member_id',
      'member_name',
      'phone',
      'text',
      'status',
      'sent_at',
      'delivered_at',
      'failure_reason',
    ],
    deliveryRows,
  );
  console.timeEnd('messaging insert');

  console.timeEnd('total');
  return {
    members: members.length,
    fellowships: fellowshipCount,
    sessions: sessions.length,
    attendanceRecords: recordRows.length,
    followUps: taskRows.length,
    deliveries: deliveryRows.length,
    messageId,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run the load-test seed when NODE_ENV=production.');
  }
  const countArg = args.find((a) => a.startsWith('--count='));
  const count = countArg ? Number(countArg.split('=')[1]) : 0;
  if (!count || count < 1) {
    throw new Error('Pass --count=N (number of members to generate).');
  }

  const url = process.env.DATABASE_URL ?? '';
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();
  if (
    !['localhost', '127.0.0.1', '::1', '[::1]'].includes(host) &&
    !args.includes('--allow-remote')
  ) {
    throw new Error(
      `DATABASE_URL host "${host}" is not local. Pass --allow-remote to seed it anyway.`,
    );
  }

  await AppDataSource.initialize();
  try {
    const summary = await AppDataSource.transaction(async (manager) => {
      const q: Query = (sql, params) => manager.query(sql, params);
      return seed(q, count);
    });
    console.log('Load-test data created:');
    console.table(summary);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
