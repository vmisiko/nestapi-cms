# Database Design — City Mega Church CMS

> PostgreSQL. All primary keys are UUIDs. All tables have `created_at` and `updated_at` timestamps unless noted.

---

## Entity Overview

```
users ──────────────────────────────────────────────────────────────┐
                                                                     │
fellowship_zones ──────────────────── fellowships ──────────────┐   │
                                           │                     │   │
                                      members ──────────────── member_departments
                                           │                     │
                                      departments ───────────────┘
                                           │
                              inventory_categories
                                           │
                              inventory_items ─────── inventory_requests
                                           │               │
                              damage_reports         (requester → members)
                                           │
                              attendance_events
                                           │
                              messages ─── message_recipients
                                           │
                              message_templates
```

---

## Enums

```sql
CREATE TYPE member_status       AS ENUM ('guest', 'member', 'leader');
CREATE TYPE member_type         AS ENUM ('adult', 'child');
CREATE TYPE activity_status     AS ENUM ('active', 'inactive');
CREATE TYPE item_condition      AS ENUM ('excellent', 'good', 'fair', 'poor');
CREATE TYPE request_status      AS ENUM ('pending', 'approved', 'rejected', 'returned');
CREATE TYPE damage_type         AS ENUM ('broken', 'lost', 'stolen', 'wear', 'other');
CREATE TYPE damage_severity     AS ENUM ('minor', 'moderate', 'severe', 'total_loss');
CREATE TYPE damage_status       AS ENUM ('pending', 'investigating', 'resolved', 'written_off');
CREATE TYPE attendance_type     AS ENUM ('service', 'midweek', 'special');
CREATE TYPE message_channel     AS ENUM ('sms', 'email');
CREATE TYPE message_status      AS ENUM ('pending', 'delivered', 'failed');
CREATE TYPE recipient_type      AS ENUM ('all', 'fellowship', 'department', 'member');
CREATE TYPE user_role           AS ENUM ('super_admin', 'admin', 'staff');
```

---

## Tables

### `users`
Admin / staff accounts that can log into the dashboard.

| Column        | Type                  | Constraints              |
|---------------|-----------------------|--------------------------|
| id            | uuid                  | PK, default gen_random_uuid() |
| email         | varchar(255)          | UNIQUE, NOT NULL         |
| password_hash | varchar(255)          | NOT NULL                 |
| role          | user_role             | NOT NULL, default 'staff' |
| member_id     | uuid                  | FK → members.id, nullable (links a user to a member profile) |
| is_active     | boolean               | NOT NULL, default true   |
| last_login_at | timestamptz           | nullable                 |
| created_at    | timestamptz           | NOT NULL, default now()  |
| updated_at    | timestamptz           | NOT NULL, default now()  |

---

### `fellowship_zones`
Geographic zones that group fellowships.

| Column     | Type         | Constraints              |
|------------|--------------|--------------------------|
| id         | uuid         | PK                       |
| name       | varchar(100) | UNIQUE, NOT NULL         |
| created_at | timestamptz  | NOT NULL, default now()  |
| updated_at | timestamptz  | NOT NULL, default now()  |

**Seed data:**
- Waiyaki Way Zone
- Thika Road Zone
- Southern Bypass Zone
- Mombasa Road Zone
- Lang'ata Road Zone
- Outer Ring Road Zone

---

### `fellowships`
Home fellowship groups run across the city.

| Column      | Type         | Constraints                              |
|-------------|--------------|------------------------------------------|
| id          | uuid         | PK                                       |
| name        | varchar(150) | NOT NULL                                 |
| slug        | varchar(150) | UNIQUE, NOT NULL (URL-safe, computed)    |
| zone_id     | uuid         | FK → fellowship_zones.id, NOT NULL       |
| leader_id   | uuid         | FK → members.id, nullable               |
| meeting_day | varchar(20)  | NOT NULL (e.g., "Wednesday")            |
| meeting_time| time         | NOT NULL                                 |
| location    | varchar(255) | NOT NULL                                 |
| status      | activity_status | NOT NULL, default 'active'           |
| description | text         | nullable                                 |
| created_at  | timestamptz  | NOT NULL, default now()                  |
| updated_at  | timestamptz  | NOT NULL, default now()                  |

**Indexes:** `idx_fellowships_zone_id`, `idx_fellowships_slug`

---

### `departments`
Ministry units within the church (Choir, Media, Youth, etc.).

| Column         | Type         | Constraints                         |
|----------------|--------------|-------------------------------------|
| id             | uuid         | PK                                  |
| name           | varchar(100) | NOT NULL                            |
| head_id        | uuid         | FK → members.id, nullable           |
| member_target  | integer      | NOT NULL, default 0                 |
| annual_budget  | numeric(12,2)| NOT NULL, default 0                 |
| budget_spent   | numeric(12,2)| NOT NULL, default 0                 |
| description    | text         | nullable                            |
| created_at     | timestamptz  | NOT NULL, default now()             |
| updated_at     | timestamptz  | NOT NULL, default now()             |

---

### `members`
The congregation — guests, members, and leaders.

| Column          | Type          | Constraints                              |
|-----------------|---------------|------------------------------------------|
| id              | uuid          | PK                                       |
| first_name      | varchar(100)  | NOT NULL                                 |
| last_name       | varchar(100)  | NOT NULL                                 |
| phone           | varchar(30)   | nullable                                 |
| email           | varchar(255)  | UNIQUE, nullable                         |
| status          | member_status | NOT NULL, default 'guest'                |
| fellowship_id   | uuid          | FK → fellowships.id, nullable            |
| member_type     | member_type   | NOT NULL, default 'adult'                |
| activity_status | activity_status | NOT NULL, default 'active'             |
| joined_at       | date          | NOT NULL, default current_date           |
| avatar_url      | varchar(500)  | nullable                                 |
| created_at      | timestamptz   | NOT NULL, default now()                  |
| updated_at      | timestamptz   | NOT NULL, default now()                  |

**Indexes:** `idx_members_fellowship_id`, `idx_members_status`, `idx_members_activity_status`

**Computed / virtual:**
- `name` = `first_name || ' ' || last_name`
- `initials` = first letters of first + last name

---

### `member_departments`
Many-to-many: a member can serve in multiple departments.

| Column        | Type        | Constraints                          |
|---------------|-------------|--------------------------------------|
| id            | uuid        | PK                                   |
| member_id     | uuid        | FK → members.id, NOT NULL            |
| department_id | uuid        | FK → departments.id, NOT NULL        |
| role          | varchar(100)| nullable (e.g., "Section Leader")    |
| joined_at     | date        | NOT NULL, default current_date       |

**Unique:** `(member_id, department_id)`

---

### `attendance_events`
A single recorded service or event attendance.

| Column            | Type             | Constraints                         |
|-------------------|------------------|-------------------------------------|
| id                | uuid             | PK                                  |
| name              | varchar(200)     | NOT NULL (e.g., "Sunday Service 8AM") |
| type              | attendance_type  | NOT NULL                            |
| event_date        | date             | NOT NULL                            |
| adults_count      | integer          | NOT NULL, default 0                 |
| children_count    | integer          | NOT NULL, default 0                 |
| first_timers_count| integer          | NOT NULL, default 0                 |
| total_count       | integer          | NOT NULL, default 0 (adults + children) |
| recorded_by       | uuid             | FK → users.id, nullable             |
| created_at        | timestamptz      | NOT NULL, default now()             |
| updated_at        | timestamptz      | NOT NULL, default now()             |

**Indexes:** `idx_attendance_event_date`, `idx_attendance_type`

---

### `inventory_categories`
Categories that classify inventory items.

| Column        | Type        | Constraints                       |
|---------------|-------------|-----------------------------------|
| id            | uuid        | PK                                |
| name          | varchar(100)| NOT NULL                          |
| department_id | uuid        | FK → departments.id, nullable     |
| leader_name   | varchar(150)| nullable                          |
| created_at    | timestamptz | NOT NULL, default now()           |
| updated_at    | timestamptz | NOT NULL, default now()           |

---

### `inventory_items`
Physical assets and supplies owned by the church.

| Column        | Type           | Constraints                           |
|---------------|----------------|---------------------------------------|
| id            | uuid           | PK                                    |
| name          | varchar(200)   | NOT NULL                              |
| code          | varchar(50)    | UNIQUE, NOT NULL (e.g., "EQ-001")    |
| category_id   | uuid           | FK → inventory_categories.id, NOT NULL |
| total_qty     | integer        | NOT NULL, default 0                   |
| available_qty | integer        | NOT NULL, default 0                   |
| condition     | item_condition | NOT NULL, default 'good'              |
| created_at    | timestamptz    | NOT NULL, default now()               |
| updated_at    | timestamptz    | NOT NULL, default now()               |

**Check:** `available_qty >= 0` AND `available_qty <= total_qty`
**Indexes:** `idx_inventory_items_category_id`, `idx_inventory_items_code`

---

### `inventory_requests`
Requests to borrow inventory items (from fellowships, departments, or individuals).

| Column            | Type           | Constraints                           |
|-------------------|----------------|---------------------------------------|
| id                | uuid           | PK                                    |
| item_id           | uuid           | FK → inventory_items.id, NOT NULL     |
| requester_id      | uuid           | FK → members.id, nullable             |
| requester_name    | varchar(150)   | NOT NULL (used when requester_id is null, e.g., "Youth Fellowship") |
| quantity          | integer        | NOT NULL, CHECK > 0                   |
| request_date      | date           | NOT NULL, default current_date        |
| return_date       | date           | NOT NULL                              |
| return_actual_date| date           | nullable                              |
| status            | request_status | NOT NULL, default 'pending'           |
| reason            | text           | nullable                              |
| reviewed_by       | uuid           | FK → users.id, nullable               |
| created_at        | timestamptz    | NOT NULL, default now()               |
| updated_at        | timestamptz    | NOT NULL, default now()               |

**Indexes:** `idx_inv_requests_item_id`, `idx_inv_requests_status`

---

### `damage_reports`
Reports for damaged, lost, or stolen inventory items.

| Column            | Type            | Constraints                           |
|-------------------|-----------------|---------------------------------------|
| id                | uuid            | PK                                    |
| item_id           | uuid            | FK → inventory_items.id, NOT NULL     |
| reported_by_id    | uuid            | FK → members.id, nullable             |
| reported_by_name  | varchar(150)    | NOT NULL                              |
| damage_type       | damage_type     | NOT NULL                              |
| severity          | damage_severity | NOT NULL                              |
| quantity_affected | integer         | NOT NULL, CHECK > 0                   |
| description       | text            | NOT NULL                              |
| report_date       | date            | NOT NULL, default current_date        |
| status            | damage_status   | NOT NULL, default 'pending'           |
| resolution        | text            | nullable                              |
| resolved_by       | uuid            | FK → users.id, nullable               |
| created_at        | timestamptz     | NOT NULL, default now()               |
| updated_at        | timestamptz     | NOT NULL, default now()               |

**Indexes:** `idx_damage_reports_item_id`, `idx_damage_reports_status`

---

### `messages`
Bulk communications sent to congregation groups.

| Column           | Type            | Constraints                         |
|------------------|-----------------|-------------------------------------|
| id               | uuid            | PK                                  |
| title            | varchar(255)    | NOT NULL                            |
| channel          | message_channel | NOT NULL                            |
| subject          | varchar(255)    | nullable (email only)               |
| content          | text            | NOT NULL                            |
| sent_at          | timestamptz     | nullable (null = not yet sent)      |
| sent_by          | uuid            | FK → users.id, NOT NULL             |
| status           | message_status  | NOT NULL, default 'pending'         |
| recipient_count  | integer         | NOT NULL, default 0                 |
| delivery_rate    | numeric(5,2)    | nullable (0–100%)                   |
| created_at       | timestamptz     | NOT NULL, default now()             |

---

### `message_recipients`
Which groups were targeted by a message (supports multiple selections per send).

| Column         | Type           | Constraints                          |
|----------------|----------------|--------------------------------------|
| id             | uuid           | PK                                   |
| message_id     | uuid           | FK → messages.id, NOT NULL           |
| recipient_type | recipient_type | NOT NULL                             |
| fellowship_id  | uuid           | FK → fellowships.id, nullable        |
| department_id  | uuid           | FK → departments.id, nullable        |
| member_id      | uuid           | FK → members.id, nullable            |

**Rule:** Exactly one of `fellowship_id`, `department_id`, `member_id` should be non-null, OR `recipient_type = 'all'` with all three null.

---

### `message_templates`
Reusable message templates.

| Column     | Type            | Constraints                       |
|------------|-----------------|-----------------------------------|
| id         | uuid            | PK                                |
| name       | varchar(200)    | NOT NULL                          |
| category   | varchar(100)    | NOT NULL (Weekly / Personal / Events / etc.) |
| channel    | message_channel | NOT NULL                          |
| subject    | varchar(255)    | nullable (email only)             |
| content    | text            | NOT NULL                          |
| created_by | uuid            | FK → users.id, NOT NULL           |
| created_at | timestamptz     | NOT NULL, default now()           |
| updated_at | timestamptz     | NOT NULL, default now()           |

---

## Key Relationships Summary

| Relationship | Type | Notes |
|---|---|---|
| fellowship_zones → fellowships | 1:N | One zone has many fellowships |
| fellowships → members | 1:N | Members belong to one fellowship |
| members → fellowships (leader) | 1:1 | A member can lead one fellowship |
| members ↔ departments | M:N | Via `member_departments` |
| departments → members (head) | 1:1 | A member heads one dept |
| inventory_categories → inventory_items | 1:N | Items belong to one category |
| departments → inventory_categories | 1:N | Category owned by a dept |
| inventory_items → inventory_requests | 1:N | Item can be requested many times |
| inventory_items → damage_reports | 1:N | Item can have many damage reports |
| users → messages | 1:N | Staff sends messages |
| messages → message_recipients | 1:N | Message can target many groups |
| users → message_templates | 1:N | Staff creates templates |
| users → attendance_events | 1:N | Staff records attendance |

---

## Circular FK Resolution

`fellowships.leader_id → members.id` and `members.fellowship_id → fellowships.id` is a circular reference. Resolve with **deferred constraints** in PostgreSQL:

```sql
ALTER TABLE fellowships
  ADD CONSTRAINT fk_fellowship_leader
  FOREIGN KEY (leader_id) REFERENCES members(id)
  DEFERRABLE INITIALLY DEFERRED;
```

This allows inserting a fellowship and its leader member in the same transaction.

---

## Recommended Indexes (beyond FKs)

```sql
-- Fast lookup by slug (used in fellowship detail page)
CREATE UNIQUE INDEX idx_fellowships_slug ON fellowships(slug);

-- Attendance analytics by month/year
CREATE INDEX idx_attendance_date ON attendance_events(event_date DESC);

-- Inventory low-stock queries
CREATE INDEX idx_inv_available ON inventory_items(available_qty);

-- Members search
CREATE INDEX idx_members_name ON members(last_name, first_name);
CREATE INDEX idx_members_email ON members(email) WHERE email IS NOT NULL;

-- Message history ordered by sent_at
CREATE INDEX idx_messages_sent_at ON messages(sent_at DESC) WHERE sent_at IS NOT NULL;
```

---

## Technology Stack

| Concern    | Choice         | Notes |
|------------|----------------|-------|
| Database   | PostgreSQL 16  | Hosted on Supabase or Railway for dev |
| ORM        | TypeORM        | Native NestJS integration |
| Migrations | TypeORM CLI    | `src/migrations/` |
| Seeding    | TypeORM seeds  | `src/seeds/` |
| Auth       | JWT (HS256)    | Access token (15m) + refresh token (7d) |
