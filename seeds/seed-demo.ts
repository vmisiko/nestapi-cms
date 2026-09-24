/**
 * Demo data for presentations and local development.
 *
 *   npm run seed:demo             seed (does nothing if demo data already exists)
 *   npm run seed:demo -- --reset  remove the demo data this script created, then seed again
 *
 * Safety:
 *  - refuses to run when NODE_ENV=production
 *  - refuses a non-local DATABASE_URL unless --allow-remote is passed
 *  - everything happens in one transaction
 *  - --reset only deletes rows carrying this script's markers (email @demo.example, the
 *    'demo-seed' description/notes marker, DEMO- item codes, demo- slugs, and the fixed
 *    message titles below). Rows you created yourself are left alone.
 *  - names, phone numbers and emails are fictional. No SMS is sent: message deliveries are
 *    inserted directly into the database.
 *
 * The random generator is seeded, so the same day always produces the same data.
 * Dates are relative to the day the script runs.
 */
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../src/data-source';

dotenv.config();

type Query = (sql: string, params?: unknown[]) => Promise<any[]>;

const MARKER = 'demo-seed';
const EMAIL_DOMAIN = 'demo.example';
const MEMBER_COUNT = 180;

const ZONES = [
  'Nairobi Central',
  'Thika Road',
  'Eastlands',
  'Kawangware',
  "Lang'ata",
];
const DEPARTMENTS: Array<[string, number]> = [
  ['Media', 25],
  ['Worship & Choir', 40],
  ['Ushering', 30],
  ["Children's Ministry", 30],
  ['Youth Ministry', 60],
  ['Prayer', 35],
  ['Hospitality', 25],
  ['Finance', 10],
];
const CATEGORIES = [
  'Audio & Media',
  'Furniture',
  'Stationery & Printing',
  'Ushering Supplies',
  'Kitchen & Hospitality',
];
const MESSAGE_TITLES = [
  'Sunday Service Reminder',
  'Youth Camp Registration',
  'Prayer Week Newsletter',
  'Midweek Service Alert',
  'Welcome to City Mega Church',
  'Building Fund Update',
  'Christmas Concert Rehearsals',
  'Volunteer Sign-up',
];

const FIRST_NAMES = [
  'Grace',
  'Faith',
  'Joy',
  'Mercy',
  'Esther',
  'Ruth',
  'Naomi',
  'Lydia',
  'Hannah',
  'Sarah',
  'David',
  'Samuel',
  'Daniel',
  'Joseph',
  'Peter',
  'Paul',
  'Timothy',
  'Caleb',
  'Joshua',
  'Isaac',
  'Wanjiru',
  'Achieng',
  'Akinyi',
  'Njeri',
  'Wambui',
  'Atieno',
  'Chebet',
  'Nyambura',
  'Wairimu',
  'Kagendo',
  'Kamau',
  'Otieno',
  'Mwangi',
  'Kiprop',
  'Ochieng',
  'Kipchoge',
  'Mutua',
  'Kariuki',
  'Odhiambo',
  'Njoroge',
];
const LAST_NAMES = [
  'Kamau',
  'Otieno',
  'Wanjiku',
  'Mwangi',
  'Achieng',
  'Kiplagat',
  'Njoroge',
  'Onyango',
  'Wafula',
  'Chebet',
  'Mutiso',
  'Karanja',
  'Odhiambo',
  'Nyamweya',
  'Kimani',
  'Mbugua',
  "Ndung'u",
  'Owino',
  'Waweru',
  'Cheruiyot',
  'Kariuki',
  'Muthoni',
  'Simiyu',
  'Kosgei',
  'Maina',
  'Ouma',
  'Gitau',
  'Barasa',
  'Rotich',
  'Wekesa',
];
const FELLOWSHIP_NAMES = [
  'Grace',
  'Hope',
  'Faith',
  'Victory',
  'Zion',
  'Bethel',
  'Living Waters',
  'The Rock',
];
const MEETING_DAYS = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MEETING_TIMES = ['17:30', '18:00', '18:30', '19:00'];

// ---------------------------------------------------------------- random helpers
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
const rand = mulberry32(20260921);
const chance = (p: number) => rand() < p;
const int = (min: number, max: number) =>
  min + Math.floor(rand() * (max - min + 1));
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
function weighted<T>(items: Array<[T, number]>): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}

// ---------------------------------------------------------------- date helpers
const DAY = 86_400_000;
const today = new Date();
today.setUTCHours(12, 0, 0, 0);
const daysAgo = (n: number) => new Date(today.getTime() - n * DAY);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// ---------------------------------------------------------------- db helpers
async function insertRows(
  q: Query,
  table: string,
  cols: string[],
  rows: unknown[][],
) {
  const CHUNK = 400;
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

async function removeDemoData(q: Query) {
  const demoMembers = `SELECT id FROM members WHERE email LIKE '%@${EMAIL_DOMAIN}'`;
  const demoTasks = `SELECT id FROM follow_up_tasks WHERE member_id IN (${demoMembers})`;
  const demoMessages = `SELECT id FROM messages WHERE title = ANY($1)`;
  const demoSessions = `SELECT id FROM attendance_sessions WHERE notes = '${MARKER}'`;

  await q(
    `DELETE FROM message_deliveries WHERE message_id IN (${demoMessages})`,
    [MESSAGE_TITLES],
  );
  await q(`DELETE FROM messages WHERE title = ANY($1)`, [MESSAGE_TITLES]);
  await q(
    `DELETE FROM damage_reports WHERE item_id IN (SELECT id FROM inventory_items WHERE code LIKE 'DEMO-%')`,
  );
  await q(`DELETE FROM inventory_items WHERE code LIKE 'DEMO-%'`);
  await q(`DELETE FROM inventory_categories WHERE description = '${MARKER}'`);
  await q(
    `DELETE FROM attendance_records WHERE session_id IN (${demoSessions})`,
  );
  await q(`DELETE FROM attendance_records WHERE member_id IN (${demoMembers})`);
  await q(`DELETE FROM attendance_sessions WHERE notes = '${MARKER}'`);
  await q(`DELETE FROM follow_up_escalations WHERE task_id IN (${demoTasks})`);
  await q(`DELETE FROM follow_up_attempts WHERE task_id IN (${demoTasks})`);
  await q(`DELETE FROM follow_up_tasks WHERE member_id IN (${demoMembers})`);
  await q(`DELETE FROM member_departments WHERE member_id IN (${demoMembers})`);
  await q(`DELETE FROM departments WHERE description = '${MARKER}'`);
  await q(`DELETE FROM members WHERE email LIKE '%@${EMAIL_DOMAIN}'`);
  await q(`DELETE FROM fellowships WHERE slug LIKE 'demo-%'`);
  await q(
    `DELETE FROM fellowship_zones z WHERE z.name = ANY($1)
       AND NOT EXISTS (SELECT 1 FROM fellowships f WHERE f.zone_id = z.id)`,
    [ZONES],
  );
}

// ---------------------------------------------------------------- seeding
interface DemoMember {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  status: 'guest' | 'member' | 'leader';
  activity: 'active' | 'inactive';
  memberType: 'adult' | 'child';
  joinedDaysAgo: number;
  fellowshipId: string | null;
  propensity: number; // 0..1 chance of attending a given service
  lapseDaysAfterJoin: number | null; // inactive members stop attending after this
}

async function seed(q: Query) {
  const [admin] = (await q(`SELECT id FROM users WHERE email = $1`, [
    process.env.ADMIN_EMAIL ?? 'admin@citymega.org',
  ])) as Array<{ id: string }>;
  if (!admin) {
    throw new Error('No admin user found. Run `npm run seed:admin` first.');
  }
  const adminId = admin.id;

  // ---- zones and fellowships
  const zoneIds = new Map<string, string>();
  await insertRows(
    q,
    'fellowship_zones',
    ['id', 'name'],
    ZONES.map((name) => {
      const id = randomUUID();
      zoneIds.set(name, id);
      return [id, name];
    }),
  );

  interface DemoFellowship {
    id: string;
    zone: string;
    name: string;
    active: boolean;
  }
  const fellowships: DemoFellowship[] = [];
  const fellowshipRows: unknown[][] = [];
  for (const zone of ZONES) {
    const names = [...FELLOWSHIP_NAMES]
      .sort(() => rand() - 0.5)
      .slice(0, int(2, 3));
    for (const n of names) {
      const id = randomUUID();
      const name = `${zone} ${n} Fellowship`;
      const active = !(fellowships.length === 9); // one dormant fellowship
      fellowships.push({ id, zone, name, active });
      fellowshipRows.push([
        id,
        name,
        `demo-${slug(name)}`,
        zoneIds.get(zone),
        pick(MEETING_DAYS),
        pick(MEETING_TIMES),
        `${zone} — host home`,
        active ? 'active' : 'inactive',
        MARKER,
      ]);
    }
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
  const activeFellowships = fellowships.filter((f) => f.active);

  // ---- members
  const usedNames = new Set<string>();
  const members: DemoMember[] = [];
  const memberRows: unknown[][] = [];
  for (let i = 0; i < MEMBER_COUNT; i++) {
    let first: string, last: string;
    do {
      first = pick(FIRST_NAMES);
      last = pick(LAST_NAMES);
    } while (usedNames.has(`${first} ${last}`) && usedNames.size < 800);
    usedNames.add(`${first} ${last}`);

    const joinedDaysAgo = weighted<[number, number]>([
      [[1, 21], 0.14],
      [[22, 60], 0.18],
      [[61, 150], 0.3],
      [[151, 400], 0.38],
    ]);
    const joined = int(joinedDaysAgo[0], joinedDaysAgo[1]);
    const isNew = joined <= 21;
    const status: DemoMember['status'] = isNew
      ? weighted([
          ['guest', 0.8],
          ['member', 0.2],
        ])
      : weighted([
          ['guest', 0.08],
          ['member', 0.77],
          ['leader', 0.15],
        ]);
    const activity: DemoMember['activity'] =
      !isNew && joined > 45 && chance(0.13) ? 'inactive' : 'active';
    const memberType: DemoMember['memberType'] = chance(0.1)
      ? 'child'
      : 'adult';
    const ageGroup =
      memberType === 'child'
        ? 'under_18'
        : chance(0.03)
          ? null
          : weighted([
              ['18_25', 0.22],
              ['26_35', 0.32],
              ['36_50', 0.28],
              ['above_50', 0.18],
            ]);
    const online = chance(0.07);
    const churchRole = isNew
      ? 'first_time_visitor'
      : online
        ? 'online_member'
        : status === 'leader'
          ? weighted([
              ['elder', 0.4],
              ['overseer', 0.35],
              ['pastor', 0.25],
            ])
          : weighted([
              ['church_member', 0.65],
              ['regular_attendee', 0.35],
            ]);
    const fellowship = chance(0.85) ? pick(activeFellowships) : null;
    const propensity =
      status === 'leader' ? 0.9 : status === 'member' ? 0.68 : 0.4;

    const m: DemoMember = {
      id: randomUUID(),
      firstName: first,
      lastName: last,
      phone: `+2547000${String(i).padStart(5, '0')}`,
      email: `${slug(first)}.${slug(last)}.${i}@${EMAIL_DOMAIN}`,
      status,
      activity,
      memberType,
      joinedDaysAgo: joined,
      fellowshipId: fellowship?.id ?? null,
      propensity,
      lapseDaysAfterJoin:
        activity === 'inactive' ? int(20, Math.max(25, joined - 20)) : null,
    };
    members.push(m);
    memberRows.push([
      m.id,
      first,
      last,
      m.phone,
      m.email,
      status,
      m.fellowshipId,
      memberType,
      activity,
      iso(daysAgo(joined)),
      chance(0.5) ? 'male' : 'female',
      ageGroup,
      churchRole,
      online,
      chance(0.03),
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
      'gender',
      'age_group',
      'church_role',
      'is_online',
      'is_international',
    ],
    memberRows,
  );

  // ---- fellowship leaders (two fellowships are left without one on purpose, to show alerts)
  for (const f of fellowships.slice(0, fellowships.length)) {
    const idx = fellowships.indexOf(f);
    if (idx === 3 || idx === 7) continue;
    const pool = members.filter(
      (m) => m.fellowshipId === f.id && m.status !== 'guest',
    );
    if (pool.length) {
      await q(`UPDATE fellowships SET leader_id = $1 WHERE id = $2`, [
        pick(pool).id,
        f.id,
      ]);
    }
  }

  // ---- departments and membership (some end up below their target on purpose)
  const leaders = members.filter((m) => m.status === 'leader');
  const deptRows: unknown[][] = [];
  const deptIds: string[] = [];
  for (const [name, target] of DEPARTMENTS) {
    const id = randomUUID();
    deptIds.push(id);
    deptRows.push([id, name, pick(leaders).id, target, MARKER]);
  }
  await insertRows(
    q,
    'departments',
    ['id', 'name', 'head_id', 'member_target', 'description'],
    deptRows,
  );
  const memberDeptRows: unknown[][] = [];
  for (const m of members) {
    if (m.status === 'guest' || m.memberType === 'child') continue;
    const count = weighted<number>([
      [0, 0.3],
      [1, 0.5],
      [2, 0.2],
    ]);
    const chosen = new Set<number>();
    while (chosen.size < count) chosen.add(int(0, DEPARTMENTS.length - 1));
    for (const d of chosen) memberDeptRows.push([m.id, deptIds[d]]);
  }
  await insertRows(
    q,
    'member_departments',
    ['member_id', 'department_id'],
    memberDeptRows,
  );

  // ---- attendance: the last 10 Sundays and 4 midweek services
  const sessions: Array<{
    id: string;
    date: Date;
    kind: 'sunday_service' | 'midweek_service';
  }> = [];
  const lastSunday = new Date(today);
  lastSunday.setUTCDate(lastSunday.getUTCDate() - lastSunday.getUTCDay());
  for (let w = 0; w < 10; w++) {
    sessions.push({
      id: randomUUID(),
      date: new Date(lastSunday.getTime() - w * 7 * DAY),
      kind: 'sunday_service',
    });
  }
  for (let w = 0; w < 4; w++) {
    sessions.push({
      id: randomUUID(),
      date: new Date(lastSunday.getTime() - (w * 7 + 4) * DAY),
      kind: 'midweek_service',
    });
  }
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    });
  await insertRows(
    q,
    'attendance_sessions',
    ['id', 'title', 'session_type', 'session_date', 'notes'],
    sessions.map((s) => [
      s.id,
      `${s.kind === 'sunday_service' ? 'Sunday Service' : 'Midweek Service'} — ${fmt(s.date)}`,
      s.kind,
      iso(s.date),
      MARKER,
    ]),
  );
  const recordRows: unknown[][] = [];
  for (const s of sessions) {
    for (const m of members) {
      const joinedAt = daysAgo(m.joinedDaysAgo);
      if (joinedAt > s.date) continue;
      const daysSinceJoin = Math.round(
        (s.date.getTime() - joinedAt.getTime()) / DAY,
      );
      const lapsed =
        m.lapseDaysAfterJoin !== null && daysSinceJoin > m.lapseDaysAfterJoin;
      let p = lapsed ? 0.02 : m.propensity;
      if (daysSinceJoin <= 14 && !lapsed) p = Math.max(p, 0.75); // people come back soon after first visit
      if (s.kind === 'midweek_service') p *= 0.35;
      if (chance(p)) {
        recordRows.push([
          s.id,
          m.id,
          'present',
          `${iso(s.date)}T${s.kind === 'sunday_service' ? '09:35' : '18:50'}:00Z`,
        ]);
      } else if (s.kind === 'sunday_service') {
        recordRows.push([s.id, m.id, chance(0.2) ? 'excused' : 'absent', null]);
      }
    }
  }
  await insertRows(
    q,
    'attendance_records',
    ['session_id', 'member_id', 'status', 'checked_in_at'],
    recordRows,
  );

  // ---- follow-up tasks and contact attempts
  const taskRows: unknown[][] = [];
  const attemptRows: unknown[][] = [];
  const methods = ['call', 'sms', 'visit', 'email'];
  const addAttempts = (
    taskId: string,
    dueDaysAgo: number,
    count: number,
    connected: boolean,
  ) => {
    for (let a = 0; a < count; a++) {
      const outcome =
        connected && a === count - 1
          ? weighted([
              ['connected', 0.7],
              ['requested_callback', 0.3],
            ])
          : weighted([
              ['no_answer', 0.7],
              ['requested_callback', 0.3],
            ]);
      const when = daysAgo(Math.max(0, dueDaysAgo + int(-2, 2)));
      attemptRows.push([
        randomUUID(),
        taskId,
        pick(methods),
        outcome,
        when.toISOString(),
        adminId,
      ]);
    }
  };
  for (const m of members) {
    const isGuestFollowUp = m.status === 'guest' && m.joinedDaysAgo <= 60;
    const isInactiveFollowUp = m.activity === 'inactive';
    if (!isGuestFollowUp && !isInactiveFollowUp) continue;
    if (!chance(0.85)) continue;
    const id = randomUUID();
    const dueDaysAgo = isGuestFollowUp
      ? Math.max(-7, m.joinedDaysAgo - 3)
      : int(-3, 40);
    const state = weighted<'completed' | 'overdue' | 'upcoming'>([
      ['completed', 0.5],
      ['overdue', 0.3],
      ['upcoming', 0.2],
    ]);
    const due =
      dueDaysAgo <= 0 || state === 'upcoming'
        ? daysAgo(-int(1, 6))
        : daysAgo(dueDaysAgo);
    const completed = state === 'completed';
    const overdue = state === 'overdue';
    const finalDue = overdue && due > today ? daysAgo(int(2, 12)) : due;
    taskRows.push([
      id,
      m.id,
      chance(0.65) ? adminId : null,
      isGuestFollowUp
        ? `Welcome & connect — ${m.firstName} ${m.lastName}`
        : `Check in with ${m.firstName} ${m.lastName}`,
      iso(finalDue),
      completed ? 'completed' : 'open',
      completed ? new Date(finalDue.getTime() - DAY).toISOString() : null,
      isGuestFollowUp
        ? weighted([
            ['visitor_automation', 0.6],
            ['manual', 0.4],
          ])
        : 'inactivity_automation',
    ]);
    const daysSinceDue = Math.round(
      (today.getTime() - finalDue.getTime()) / DAY,
    );
    if (completed) addAttempts(id, daysSinceDue + 1, int(1, 2), true);
    else if (overdue && chance(0.5))
      addAttempts(id, Math.max(1, daysSinceDue - 1), 1, false);
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
    [
      'id',
      'task_id',
      'contact_method',
      'outcome',
      'contacted_at',
      'created_by_id',
    ],
    attemptRows,
  );

  // ---- messages and deliveries (rows only; nothing is sent)
  const phoneOf = new Map(members.map((m) => [m.id, m.phone]));
  const nameOf = new Map(
    members.map((m) => [m.id, `${m.firstName} ${m.lastName}`]),
  );
  const messages: Array<[string, string, string, string, number | null]> = [
    [
      'Sunday Service Reminder',
      'reminder',
      'all',
      'Join us this Sunday at 9:00 AM. Come with a friend!',
      3,
    ],
    [
      'Youth Camp Registration',
      'announcement',
      'department',
      'Youth camp registration is now open. See your leader to sign up.',
      8,
    ],
    [
      'Prayer Week Newsletter',
      'newsletter',
      'all',
      'This week we gather each evening at 6 PM for prayer.',
      15,
    ],
    [
      'Midweek Service Alert',
      'alert',
      'fellowship',
      'Tonight’s midweek service is moved to 7:00 PM.',
      21,
    ],
    [
      'Welcome to City Mega Church',
      'announcement',
      'members',
      'We are so glad you visited. We would love to see you again!',
      30,
    ],
    [
      'Building Fund Update',
      'announcement',
      'all',
      'Thank you for your giving. The building fund is at 62% of target.',
      40,
    ],
    [
      'Christmas Concert Rehearsals',
      'reminder',
      'department',
      'Rehearsals start next week. Details to follow.',
      null,
    ],
    [
      'Volunteer Sign-up',
      'announcement',
      'all',
      'We need ushers and hospitality volunteers. Reply to sign up.',
      null,
    ],
  ];
  const messageRows: unknown[][] = [];
  const deliveryRows: unknown[][] = [];
  for (const [title, type, target, body, sentDaysAgo] of messages) {
    const id = randomUUID();
    const sent = sentDaysAgo !== null;
    const sentAt = sent ? daysAgo(sentDaysAgo) : null;
    messageRows.push([
      id,
      title,
      body,
      type,
      target,
      sent ? 'sent' : 'draft',
      sentAt,
      adminId,
    ]);
    if (!sent) continue;
    const audience = [...members]
      .sort(() => rand() - 0.5)
      .slice(0, int(35, 90));
    for (const m of audience) {
      const status = weighted<'delivered' | 'sent' | 'pending' | 'failed'>([
        ['delivered', 0.87],
        ['sent', 0.05],
        ['pending', 0.02],
        ['failed', 0.06],
      ]);
      deliveryRows.push([
        randomUUID(),
        id,
        m.id,
        nameOf.get(m.id),
        phoneOf.get(m.id),
        body,
        status,
        status === 'pending' ? null : sentAt,
        status === 'delivered' ? sentAt : null,
        status === 'failed' ? 'Number unreachable' : null,
      ]);
    }
  }
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
    messageRows,
  );
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

  // ---- inventory (a few items are deliberately low on stock) and damage reports
  const categoryIds = new Map<string, string>();
  await insertRows(
    q,
    'inventory_categories',
    ['id', 'name', 'description'],
    CATEGORIES.map((name) => {
      const id = randomUUID();
      categoryIds.set(name, id);
      return [id, name, MARKER];
    }),
  );
  const items: Array<[string, string, number, number, string]> = [
    ['Wireless microphone', 'Audio & Media', 12, 9, 'good'],
    ['PA speaker', 'Audio & Media', 6, 5, 'good'],
    ['Mixing console', 'Audio & Media', 2, 2, 'excellent'],
    ['HDMI cable', 'Audio & Media', 20, 2, 'fair'],
    ['Plastic chair', 'Furniture', 400, 372, 'good'],
    ['Folding table', 'Furniture', 40, 33, 'good'],
    ['Pulpit', 'Furniture', 2, 2, 'excellent'],
    ['Offering envelope (box)', 'Stationery & Printing', 80, 3, 'excellent'],
    ['Visitor card (pack)', 'Stationery & Printing', 100, 12, 'excellent'],
    ['Printer paper (ream)', 'Stationery & Printing', 60, 41, 'excellent'],
    ['Usher sash', 'Ushering Supplies', 30, 26, 'good'],
    ['Name badge', 'Ushering Supplies', 200, 0, 'good'],
    ['Communion cup (tray)', 'Kitchen & Hospitality', 50, 44, 'excellent'],
    ['Tea urn', 'Kitchen & Hospitality', 4, 4, 'good'],
    ['Serving tray', 'Kitchen & Hospitality', 24, 21, 'fair'],
  ];
  const itemIds: string[] = [];
  await insertRows(
    q,
    'inventory_items',
    [
      'id',
      'name',
      'code',
      'category_id',
      'total_qty',
      'available_qty',
      'condition',
    ],
    items.map(([name, cat, total, available, condition], i) => {
      const id = randomUUID();
      itemIds.push(id);
      return [
        id,
        name,
        `DEMO-${String(i + 1).padStart(3, '0')}`,
        categoryIds.get(cat),
        total,
        available,
        condition,
      ];
    }),
  );
  const reporters = ['Peter Kamau', 'Ruth Achieng', 'Samuel Otieno'];
  const damage: Array<
    [number, string, string, number, string, number, string]
  > = [
    [
      1,
      'broken',
      'severe',
      1,
      'PA speaker cone cracked during Sunday service.',
      4,
      'pending',
    ],
    [
      0,
      'broken',
      'moderate',
      2,
      'Two microphones stopped working.',
      9,
      'pending',
    ],
    [4, 'broken', 'minor', 6, 'Six chairs with broken legs.', 12, 'pending'],
    [3, 'wear', 'minor', 3, 'HDMI connectors worn out.', 25, 'investigating'],
    [
      14,
      'lost',
      'moderate',
      2,
      'Two serving trays missing after the conference.',
      40,
      'resolved',
    ],
    [5, 'broken', 'minor', 1, 'Folding table hinge replaced.', 55, 'resolved'],
  ];
  await insertRows(
    q,
    'damage_reports',
    [
      'id',
      'item_id',
      'reported_by_name',
      'damage_type',
      'severity',
      'quantity_affected',
      'description',
      'report_date',
      'status',
    ],
    damage.map(([idx, type, severity, qty, description, ago, status]) => [
      randomUUID(),
      itemIds[idx],
      pick(reporters),
      type,
      severity,
      qty,
      description,
      iso(daysAgo(ago)),
      status,
    ]),
  );

  return {
    members: members.length,
    fellowships: fellowships.length,
    departments: DEPARTMENTS.length,
    sessions: sessions.length,
    attendanceRecords: recordRows.length,
    followUps: taskRows.length,
    contactAttempts: attemptRows.length,
    messages: messageRows.length,
    deliveries: deliveryRows.length,
    inventoryItems: items.length,
    damageReports: damage.length,
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data when NODE_ENV=production.');
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
      const [{ n }] = (await q(
        `SELECT count(*)::int AS n FROM members WHERE email LIKE '%@${EMAIL_DOMAIN}'`,
      )) as Array<{ n: number }>;
      if (n > 0 && !args.includes('--reset')) {
        console.log(
          `Demo data already present (${n} demo members). Use --reset to rebuild it.`,
        );
        return null;
      }
      if (n > 0) {
        await removeDemoData(q);
        console.log('Removed the previous demo data.');
      }
      return seed(q);
    });
    if (summary) {
      console.log('Demo data created:');
      console.table(summary);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
