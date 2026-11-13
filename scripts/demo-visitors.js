#!/usr/bin/env node
/**
 * Demo data for the first-time visitor module (LOCAL DEVELOPMENT ONLY).
 *
 *   node scripts/demo-visitors.js seed     load ~64 visitors with attendance and follow-ups
 *   node scripts/demo-visitors.js clean    remove everything this script created
 *
 * It goes through the real API, so it exercises the real process: registering a
 * first-time visitor (which makes the backend create the follow-up task), assigning
 * workers, recording contact attempts, completing tasks and recording attendance.
 *
 * Everything it creates is tagged so `clean` can find it again:
 *   - visitors have an email ending in @demo.invalid
 *   - attendance sessions it creates have the note "[demo data]"
 * Deleting a visitor also deletes their follow-ups and attendance records.
 *
 * The API allows 100 requests a minute, so this paces itself and takes several minutes.
 */
const API = process.env.DEMO_API_URL || 'http://localhost:3005/api';
const EMAIL = process.env.DEMO_ADMIN_EMAIL || 'admin@citymega.org';
const PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'Admin@123456';
const DEMO_DOMAIN = '@demo.invalid';
const SESSION_NOTE = '[demo data]';
const VISITORS = 64;
const WEEKS = 15; // Sundays, oldest first; the newest is the most recent Sunday

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(API)) {
  console.error('Refusing to run: this script only talks to a local API. Got ' + API);
  process.exit(1);
}

// ── API helper: paced under the 100/min limit, retries on 429 ────────────────
let token = null;
let lastCall = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(method, path, body) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = 680 - (Date.now() - lastCall);
    if (wait > 0) await sleep(wait);
    lastCall = Date.now();
    const res = await fetch(API + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 429) {
      const retry = Number(res.headers.get('retry-after')) || 20;
      console.log(`  rate limited, waiting ${retry}s`);
      await sleep(retry * 1000);
      continue;
    }
    const text = await res.text();
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    return data;
  }
  throw new Error(`${method} ${path} kept getting rate limited`);
}
async function login() {
  const data = await api('POST', '/auth/login', { email: EMAIL, password: PASSWORD });
  token = data.accessToken;
}

// ── dates ─────────────────────────────────────────────────────────────────────
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return fmt(d); };
const diffDays = (a, b) => Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000);
const today = fmt(new Date());
const latestSunday = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return fmt(d); })();
const sundays = Array.from({ length: WEEKS }, (_, k) => addDays(latestSunday, -7 * (WEEKS - 1 - k)));

// ── deterministic randomness so a re-seed looks the same ─────────────────────
let seedState = 20261113;
const rand = () => {
  seedState |= 0; seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;

const FEMALE = ['Daisy', 'Victorine', 'Ruth', 'Mercy', 'Vivian', 'Grace', 'Faith', 'Joy', 'Esther', 'Lydia', 'Nancy', 'Purity', 'Sharon', 'Beatrice', 'Naomi', 'Rose', 'Miriam', 'Lilian', 'Cynthia', 'Brenda'];
const MALE = ['Solomon', 'Brian', 'Kevin', 'Peter', 'Samuel', 'David', 'Joseph', 'Dennis', 'Victor', 'Kelvin', 'Emmanuel', 'Moses', 'Collins', 'Allan', 'Felix', 'Martin', 'Isaac', 'Elijah', 'Patrick', 'Eric'];
const SURNAMES = ['Akoth', 'Nafula', 'Nakate', 'Chepkorir', 'Akinyi', 'Khisa', 'Wanjiku', 'Otieno', 'Mwangi', 'Kamau', 'Njeri', 'Odhiambo', 'Wekesa', 'Kiptoo', 'Achieng', 'Mutua', 'Barasa', 'Cheruiyot', 'Wairimu', 'Omondi', 'Naliaka', 'Kariuki', 'Atieno', 'Simiyu'];

// ── who the visitors are and how they behave ────────────────────────────────
function allocateByWeek() {
  // A few more recent than old, so newer cohorts have unassigned follow-ups to show.
  const weights = sundays.map((_, k) => (k < 2 ? 3 : k < 9 ? 4 : k < 13 ? 5 : 6));
  const total = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((w) => Math.floor((w / total) * VISITORS));
  let rest = VISITORS - counts.reduce((a, b) => a + b, 0);
  for (let k = counts.length - 1; rest > 0; k = (k - 1 + counts.length) % counts.length, rest--) counts[k] += 1;
  return counts;
}

function buildVisitors() {
  const list = [];
  allocateByWeek().forEach((count, weekIndex) => {
    for (let n = 0; n < count; n++) {
      const g = rand();
      const gender = g < 0.46 ? 'female' : g < 0.9 ? 'male' : null;
      const first = gender === 'male' ? pick(MALE) : gender === 'female' ? pick(FEMALE) : pick([...FEMALE, ...MALE]);
      const s = rand();
      const stayType = s < 0.68 ? 'permanent' : s < 0.94 ? 'temporary' : null;
      list.push({ index: list.length + 1, weekIndex, firstName: first, lastName: pick(SURNAMES), gender, stayType });
    }
  });
  // Attendance behaviour
  for (const v of list) {
    const later = sundays.length - 1 - v.weekIndex; // Sundays after the first visit
    const attended = [v.weekIndex];
    const r = rand();
    let profile;
    if (v.stayType === 'temporary') {
      profile = 'visiting';
      for (let k = 1; k <= Math.min(later, 3); k++) if (chance(0.3)) attended.push(v.weekIndex + k);
    } else if (r < 0.28) {
      profile = 'regular';
      for (let k = 1; k <= later; k++) if (chance(0.85)) attended.push(v.weekIndex + k);
    } else if (r < 0.55) {
      profile = 'returning';
      for (let k = 1; k <= Math.min(later, 8); k++) if (chance(0.3)) attended.push(v.weekIndex + k);
      if (attended.length === 1 && later >= 1) attended.push(v.weekIndex + 1 + Math.floor(rand() * Math.min(later, 4)));
    } else if (r < 0.85) {
      profile = 'one-time';
    } else {
      profile = 'dropped';
      const run = 3 + Math.floor(rand() * 3);
      for (let k = 1; k <= Math.min(later, run); k++) attended.push(v.weekIndex + k);
    }
    v.profile = profile;
    v.attendedWeeks = [...new Set(attended)].sort((a, b) => a - b);
    v.joinedAt = sundays[v.weekIndex];
    v.email = `demo.visitor.${pad(v.index)}${DEMO_DOMAIN}`;
    v.phone = `0700000${String(v.index).padStart(3, '0')}`;
  }
  return list;
}

// ── seed ──────────────────────────────────────────────────────────────────────
async function findDemoMembers() {
  const found = [];
  for (let page = 1; ; page++) {
    const res = await api('GET', `/members?search=${encodeURIComponent('demo.visitor')}&limit=100&page=${page}`);
    const rows = res.data || res;
    for (const m of rows) if (m.email && m.email.endsWith(DEMO_DOMAIN)) found.push(m);
    if (rows.length < 100) break;
  }
  return found;
}

async function seed() {
  await login();
  const existing = await findDemoMembers();
  if (existing.length) {
    console.log(`Demo data is already loaded (${existing.length} visitors). Run "clean" first to reload it.`);
    return;
  }
  const users = await api('GET', '/users');
  const workers = (users.data || users).filter((u) => u.isActive);
  if (!workers.length) throw new Error('No active user to assign follow-ups to');
  console.log(`Workers available: ${workers.map((w) => w.email).join(', ')}`);

  const visitors = buildVisitors();
  console.log(`Registering ${visitors.length} first-time visitors across ${WEEKS} Sundays (${sundays[0]} to ${latestSunday})...`);
  for (const v of visitors) {
    const created = await api('POST', '/members', {
      firstName: v.firstName, lastName: v.lastName, email: v.email, phone: v.phone,
      status: 'guest', memberType: 'adult', activityStatus: 'active', churchRole: 'first_time_visitor',
      ...(v.gender && { gender: v.gender }), ...(v.stayType && { stayType: v.stayType }),
      joinedAt: v.joinedAt,
    });
    v.id = created.id;
    if (v.index % 10 === 0) console.log(`  registered ${v.index}/${visitors.length}`);
  }

  // Attendance: reuse a session if one exists that day, otherwise create it (tagged).
  console.log('Setting up attendance sessions...');
  const existingSessions = await api('GET', '/attendance/sessions?limit=500');
  const sessionKey = (date, type) => `${String(date).slice(0, 10)}|${type}`;
  const sessions = new Map();
  for (const s of existingSessions.data || existingSessions) sessions.set(sessionKey(s.sessionDate, s.sessionType), s.id);
  const createdSessions = [];
  const ensureSession = async (date, type, title) => {
    const key = sessionKey(date, type);
    if (sessions.has(key)) return sessions.get(key);
    const s = await api('POST', '/attendance/sessions', { title, sessionType: type, sessionDate: date, notes: SESSION_NOTE });
    sessions.set(key, s.id); createdSessions.push(s.id);
    return s.id;
  };
  const sundayIds = [];
  for (const date of sundays) sundayIds.push(await ensureSession(date, 'sunday_service', 'Sunday Service'));
  const midweekDates = sundays.slice(5).map((d) => addDays(d, 3)).filter((d) => d <= today);
  const midweekIds = [];
  for (const date of midweekDates) midweekIds.push(await ensureSession(date, 'midweek_service', 'Midweek Service'));
  const fellowshipIds = [];
  for (const date of [addDays(sundays[8], 5), addDays(sundays[11], 5)].filter((d) => d <= today)) fellowshipIds.push(await ensureSession(date, 'fellowship', 'Cell Fellowship'));
  const specialId = await ensureSession(addDays(sundays[10], 6), 'special_event', 'Youth Conference');

  console.log('Recording attendance...');
  let records = 0;
  const lastSeen = new Map();
  for (const v of visitors) {
    for (const w of v.attendedWeeks) {
      await api('POST', '/attendance/records', { sessionId: sundayIds[w], memberId: v.id, status: 'present' });
      records++; lastSeen.set(v.id, sundays[w]);
    }
    if (v.profile === 'regular') {
      for (const id of midweekIds) if (chance(0.25)) { await api('POST', '/attendance/records', { sessionId: id, memberId: v.id, status: 'present' }); records++; }
    }
    if ((v.profile === 'regular' || v.profile === 'returning') && chance(0.35)) { await api('POST', '/attendance/records', { sessionId: pick(fellowshipIds), memberId: v.id, status: 'present' }); records++; }
    if (v.profile === 'regular' && chance(0.4)) { await api('POST', '/attendance/records', { sessionId: specialId, memberId: v.id, status: 'present' }); records++; }
    if (v.index % 10 === 0) console.log(`  attendance for ${v.index}/${visitors.length} visitors`);
  }

  // Visitors who stopped coming for 4+ weeks are marked inactive, as the inactivity check would.
  console.log('Marking visitors who stopped attending as inactive...');
  let inactive = 0;
  for (const v of visitors) {
    const seen = lastSeen.get(v.id) || v.joinedAt;
    if (diffDays(today, seen) >= 28) { await api('PATCH', `/members/${v.id}`, { activityStatus: 'inactive' }); v.inactive = true; inactive++; }
  }

  // Follow-ups: the backend created one per visitor when they were registered.
  console.log('Working through follow-ups...');
  const tasks = await api('GET', '/follow-ups');
  const taskByMember = new Map();
  for (const t of tasks) if (t.source === 'visitor_automation' && !taskByMember.has(t.memberId)) taskByMember.set(t.memberId, t);
  const toAssign = [];
  const stats = { completed: 0, inProgress: 0, pending: 0, unassigned: 0, attempts: 0, automatic: 0, manual: 0 };
  const METHODS = ['call', 'call', 'call', 'sms', 'visit'];
  for (const v of visitors) {
    let task = taskByMember.get(v.id);
    if (task) stats.automatic++;
    else { task = await api('POST', '/follow-ups', { memberId: v.id, title: `Welcome & connect — ${v.firstName} ${v.lastName}`, dueDate: addDays(v.joinedAt, 2) }); stats.manual++; }
    const pr = rand();
    const priority = pr < 0.1 ? 'urgent' : pr < 0.3 ? 'high' : pr < 0.4 ? 'low' : 'normal';
    await api('PATCH', `/follow-ups/${task.id}`, { dueDate: addDays(v.joinedAt, 2), priority });

    const age = diffDays(today, v.joinedAt);
    const recent = age <= 7;
    if (recent && chance(0.55)) { stats.unassigned++; stats.pending++; continue; } // left for the "assign visitors" banner
    toAssign.push(task.id);
    if (recent) { stats.pending++; continue; }
    const outcomeRoll = rand();
    const contactedAt = (k) => new Date(`${addDays(v.joinedAt, 1 + k)}T10:30:00`).toISOString();
    if (outcomeRoll < 0.62) {
      if (chance(0.4)) { await api('POST', `/follow-ups/${task.id}/attempts`, { contactMethod: 'call', outcome: 'no_answer', contactedAt: contactedAt(0) }); stats.attempts++; }
      await api('POST', `/follow-ups/${task.id}/attempts`, { contactMethod: pick(METHODS), outcome: 'connected', notes: 'Welcomed and invited to next Sunday.', contactedAt: contactedAt(1) }); stats.attempts++;
      await api('PATCH', `/follow-ups/${task.id}`, { status: 'completed' }); stats.completed++;
    } else if (outcomeRoll < 0.8) {
      await api('POST', `/follow-ups/${task.id}/attempts`, { contactMethod: 'call', outcome: pick(['no_answer', 'requested_callback']), contactedAt: contactedAt(0) }); stats.attempts++;
      if (chance(0.4)) { await api('POST', `/follow-ups/${task.id}/attempts`, { contactMethod: 'sms', outcome: 'no_answer', contactedAt: contactedAt(2) }); stats.attempts++; }
      stats.inProgress++;
    } else {
      stats.pending++;
    }
  }
  console.log(`Assigning ${toAssign.length} follow-ups to workers...`);
  const chunks = [];
  for (let i = 0; i < toAssign.length; i++) { (chunks[i % workers.length] ||= []).push(toAssign[i]); }
  for (let w = 0; w < workers.length; w++) {
    const ids = chunks[w] || [];
    for (let i = 0; i < ids.length; i += 100) await api('POST', '/follow-ups/assign', { taskIds: ids.slice(i, i + 100), ownerId: workers[w].id || JSON.parse(Buffer.from(token.split('.')[1], 'base64')).sub });
  }

  const profiles = visitors.reduce((acc, v) => ({ ...acc, [v.profile]: (acc[v.profile] || 0) + 1 }), {});
  console.log('\nDone.');
  console.log(`  visitors: ${visitors.length}  (${JSON.stringify(profiles)})`);
  console.log(`  attendance records: ${records}   new sessions created: ${createdSessions.length}`);
  console.log(`  marked inactive: ${inactive}`);
  console.log(`  follow-ups: ${stats.automatic} created by the sign-up automation, ${stats.manual} created by this script`);
  console.log(`  outcomes: ${stats.completed} completed, ${stats.inProgress} in progress, ${stats.pending} pending (${stats.unassigned} still unassigned), ${stats.attempts} contact attempts`);
}

// ── clean ─────────────────────────────────────────────────────────────────────
async function clean() {
  await login();
  const members = await findDemoMembers();
  console.log(`Removing ${members.length} demo visitors (and their follow-ups and attendance)...`);
  for (const m of members) await api('DELETE', `/members/${m.id}`);
  const sessions = await api('GET', '/attendance/sessions?limit=500');
  const mine = (sessions.data || sessions).filter((s) => s.notes === SESSION_NOTE);
  console.log(`Removing ${mine.length} demo attendance sessions...`);
  for (const s of mine) await api('DELETE', `/attendance/sessions/${s.id}`);
  console.log('Done.');
}

const command = process.argv[2];
(command === 'seed' ? seed() : command === 'clean' ? clean() : Promise.reject(new Error('Usage: node scripts/demo-visitors.js seed|clean')))
  .catch((e) => { console.error('FAILED:', e.message); process.exit(1); });
