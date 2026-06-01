# Backend Roadmap — City Mega Church CMS API

> NestJS + TypeORM + PostgreSQL. Each phase ships as independently testable and deployable vertical slices.

---

## Clean Architecture Pattern (per module)

Every NestJS module follows this layer structure — mirroring the frontend architecture:

```
src/
└── <module>/
    ├── domain/
    │   ├── <Entity>.ts               # Pure TypeScript entity (no ORM decorators)
    │   ├── I<Entity>Repository.ts    # Repository contract interface
    │   └── usecases/
    │       ├── Get<Entities>UseCase.ts
    │       ├── Create<Entity>UseCase.ts
    │       └── ...
    ├── application/
    │   └── <Module>Service.ts        # Orchestrates use-cases, maps DTOs
    ├── infrastructure/
    │   ├── <Entity>.entity.ts        # TypeORM entity (ORM decorators here)
    │   └── <Entity>Repository.ts     # Implements I<Entity>Repository
    └── presentation/
        ├── <module>.controller.ts    # HTTP layer — thin, delegates to service
        ├── dto/
        │   ├── create-<entity>.dto.ts
        │   ├── update-<entity>.dto.ts
        │   └── <entity>-response.dto.ts
        └── <module>.module.ts
```

**Dependency direction:** `presentation → application → domain ← infrastructure`

The controller never touches repositories. Services never import TypeORM directly. Domain entities have zero framework imports.

---

## Phase 1 — Foundation (Start Here)

**Goal:** Runnable API with auth, database connection, and health check. Everything else builds on this.

### 1.1 Project Setup
- [ ] Install dependencies: `@nestjs/typeorm typeorm pg @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt bcryptjs class-validator class-transformer`
- [ ] Configure `ConfigModule` (`.env` → `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`)
- [ ] Wire `TypeOrmModule` with connection config and `autoLoadEntities: true`
- [ ] Set up global `ValidationPipe` with `whitelist: true, transform: true`
- [ ] Add `helmet` and `compression` middleware
- [ ] Add CORS config for the Next.js frontend origin

### 1.2 Database
- [ ] Create all enums (see `DATABASE.md` — Enums section)
- [ ] Create `users` table migration
- [ ] Seed one super-admin user

### 1.3 Auth Module (`src/auth/`)
Resources: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`

Domain entities: `User` (id, email, role, isActive)

Use-cases:
- `LoginUseCase` — validates credentials, returns token pair
- `RefreshTokenUseCase` — validates refresh token, issues new access token
- `LogoutUseCase` — invalidates refresh token

Guards (global default: `JwtAuthGuard`):
- `JwtAuthGuard` — validates access token
- `RolesGuard` — checks `@Roles()` decorator

Tokens:
- Access token: 15-minute JWT (stored in memory on frontend)
- Refresh token: 7-day JWT (stored in httpOnly cookie)

### 1.4 Users Module (`src/users/`)
Resources: `GET /users`, `GET /users/:id`, `PATCH /users/:id`, `DELETE /users/:id`

CRUD for staff/admin accounts. Only `super_admin` can create/delete users.

---

## Phase 2 — Core Entities

These are the load-bearing tables. Fellowships, Members, and Departments must exist before anything else can reference them.

### 2.1 Fellowship Zones Module (`src/fellowship-zones/`)
Resources: `GET /fellowship-zones`, `POST /fellowship-zones`, `PATCH /fellowship-zones/:id`, `DELETE /fellowship-zones/:id`

Simple CRUD. Seed the 6 standard zones on migration.

### 2.2 Fellowships Module (`src/fellowships/`)
Resources:
- `GET /fellowships` — list with zone, member count, leader
- `GET /fellowships/:id` — detail
- `GET /fellowships/slug/:slug` — by URL slug (mirrors frontend routing)
- `POST /fellowships`
- `PATCH /fellowships/:id`
- `DELETE /fellowships/:id`

Domain use-cases:
- `GetFellowshipsUseCase` — supports filtering by zone, status
- `GetFellowshipBySlugUseCase`
- `CreateFellowshipUseCase` — auto-generates slug from name
- `UpdateFellowshipUseCase`

Notes:
- `slug` is auto-generated from `name` on create (same logic as frontend `fellowshipSlug()`)
- `members` count is a computed aggregate — do NOT store; query with JOIN

### 2.3 Departments Module (`src/departments/`)
Resources:
- `GET /departments`
- `GET /departments/:id`
- `POST /departments`
- `PATCH /departments/:id`
- `DELETE /departments/:id`

Domain use-cases:
- `GetDepartmentsUseCase`
- `CreateDepartmentUseCase`
- `UpdateDepartmentUseCase`
- `UpdateBudgetSpentUseCase`

### 2.4 Members Module (`src/members/`)
Resources:
- `GET /members` — paginated, filter by status/fellowship/department/memberType/activityStatus/joinDateRange
- `GET /members/:id`
- `GET /members/:id/departments` — departments a member serves in
- `POST /members`
- `PATCH /members/:id`
- `DELETE /members/:id`
- `POST /members/:id/departments/:departmentId` — assign member to dept
- `DELETE /members/:id/departments/:departmentId` — remove from dept

Domain entity: `Member` (mirrors frontend `Member` type, split into first/last name)

Domain use-cases:
- `GetMembersUseCase` — applies `PeopleFilterState` equivalent
- `GetMemberByIdUseCase`
- `CreateMemberUseCase`
- `UpdateMemberUseCase`
- `AssignMemberToDepartmentUseCase`
- `RemoveMemberFromDepartmentUseCase`

Query filters (maps 1:1 to frontend filters):
- `status`, `fellowship_id`, `department_id`, `member_type`, `activity_status`, `join_date_range`

---

## Phase 3 — Operations

### 3.1 Attendance Module (`src/attendance/`)
Resources:
- `GET /attendance` — list, filter by type/date range
- `GET /attendance/summary?month=YYYY-MM` — aggregated stats for dashboard
- `GET /attendance/weekly-trend?month=YYYY-MM` — weekly chart data
- `POST /attendance`
- `PATCH /attendance/:id`
- `DELETE /attendance/:id`

Domain use-cases:
- `GetAttendanceUseCase`
- `GetAttendanceSummaryUseCase` — monthly totals, averages
- `GetWeeklyTrendUseCase` — groups by ISO week
- `RecordAttendanceUseCase`

Notes:
- `total_count` is always `adults_count + children_count` — enforce in use-case, not DB trigger
- The dashboard KPI for "Average Sunday" is computed by `GetAttendanceSummaryUseCase`

### 3.2 Inventory Module (`src/inventory/`)
Four sub-resources under one module:

#### Categories — `src/inventory/categories/`
- `GET /inventory/categories`
- `POST /inventory/categories`
- `PATCH /inventory/categories/:id`
- `DELETE /inventory/categories/:id`

#### Items — `src/inventory/items/`
- `GET /inventory/items` — filter by category, search by name/code
- `GET /inventory/items/:id`
- `GET /inventory/items/low-stock` — availableQty < 20% of totalQty
- `POST /inventory/items`
- `PATCH /inventory/items/:id`
- `DELETE /inventory/items/:id`

Domain use-cases:
- `GetInventoryItemsUseCase`
- `GetLowStockItemsUseCase`
- `CreateInventoryItemUseCase`
- `UpdateInventoryItemUseCase`
- `AdjustAvailableQtyUseCase` — called when a request is approved/returned

#### Requests — `src/inventory/requests/`
- `GET /inventory/requests` — filter by status
- `POST /inventory/requests`
- `PATCH /inventory/requests/:id/approve`
- `PATCH /inventory/requests/:id/reject`
- `PATCH /inventory/requests/:id/return`

Domain use-cases:
- `GetInventoryRequestsUseCase`
- `CreateInventoryRequestUseCase` — validates available qty
- `ApproveRequestUseCase` — decrements `available_qty` on item
- `RejectRequestUseCase`
- `MarkReturnedUseCase` — restores `available_qty` on item

#### Damage Reports — `src/inventory/damage-reports/`
- `GET /inventory/damage-reports` — filter by status
- `POST /inventory/damage-reports`
- `PATCH /inventory/damage-reports/:id/investigate`
- `PATCH /inventory/damage-reports/:id/resolve`
- `PATCH /inventory/damage-reports/:id/write-off` — decrements total_qty and available_qty

Domain use-cases:
- `GetDamageReportsUseCase`
- `CreateDamageReportUseCase`
- `UpdateDamageReportStatusUseCase`
- `WriteOffItemUseCase` — permanently reduces item qty

---

## Phase 4 — Communication

### 4.1 Messaging Module (`src/messaging/`)

#### Messages
- `GET /messaging/messages` — history, filter by channel/status
- `POST /messaging/messages` — compose and send
- `GET /messaging/messages/:id`

#### Templates
- `GET /messaging/templates`
- `POST /messaging/templates`
- `PATCH /messaging/templates/:id`
- `DELETE /messaging/templates/:id`

Domain use-cases:
- `GetMessagesUseCase`
- `SendMessageUseCase` — resolves recipient groups to actual member counts, dispatches via SMS/email provider
- `GetTemplatesUseCase`
- `CreateTemplateUseCase`

SMS provider integration: Africa's Talking (Kenya-based, fits the church location)
Email provider: SendGrid or Resend

Notes:
- `SendMessageUseCase` resolves each `recipient_type` to a count and stores `recipient_count` on the message
- Actual delivery is async — fire the external API call, update `status` and `delivery_rate` via webhook or polling
- Provider integrations live in `infrastructure/` (e.g., `AfricasTalkingSmsSender.ts` implementing `ISmsSender`)

---

## Phase 5 — Dashboard Aggregation

A dedicated stats endpoint to power the dashboard KPI cards and charts. This avoids the frontend making 5 separate calls.

- `GET /dashboard/summary` — returns: totalMembers, newGuestsThisWeek, avgSundayAttendance, activeFellowshipsCount
- `GET /dashboard/membership-trend?months=6` — member growth over time
- `GET /dashboard/attendance-trend?months=3` — weekly attendance chart data
- `GET /dashboard/alerts` — low stock items, pending requests, pending damage reports

Use-cases:
- `GetDashboardSummaryUseCase`
- `GetMembershipTrendUseCase`
- `GetAttendanceTrendUseCase`
- `GetPriorityAlertsUseCase`

---

## Migration Sequence

Run these in order — each depends on the previous:

```
1. fellowship_zones
2. fellowships          (FK → fellowship_zones)
3. departments
4. members              (FK → fellowships, departments via member_departments)
5. member_departments   (FK → members, departments)
6. users                (FK → members, optional)
7. attendance_events    (FK → users)
8. inventory_categories (FK → departments)
9. inventory_items      (FK → inventory_categories)
10. inventory_requests  (FK → inventory_items, members, users)
11. damage_reports      (FK → inventory_items, members, users)
12. messages            (FK → users)
13. message_recipients  (FK → messages, fellowships, departments, members)
14. message_templates   (FK → users)
```

---

## Implementation Order Summary

| Phase | Module              | Unblocks |
|-------|---------------------|----------|
| 1     | Auth, Users         | All authenticated endpoints |
| 2a    | Fellowship Zones    | Fellowships |
| 2b    | Fellowships         | Members |
| 2c    | Departments         | Members, Inventory categories |
| 2d    | Members             | Messaging, Attendance, Requests |
| 3a    | Attendance          | Dashboard |
| 3b    | Inventory (all 4)   | Dashboard alerts |
| 4     | Messaging           | Dashboard |
| 5     | Dashboard           | Frontend integration complete |

---

## Frontend Integration Checklist

When each phase is ready, the frontend data layer swaps mock repositories for real HTTP repositories. No other layers change — this is the payoff of the clean architecture.

| Frontend mock file | Swap target |
|--------------------|-------------|
| `data/mock/MemberRepository.ts` | `data/api/MemberRepository.ts` (calls `GET /members`) |
| `data/mock/FellowshipRepository.ts` | `data/api/FellowshipRepository.ts` (calls `GET /fellowships`) |
| Inline mock in `attendance/page.tsx` | `data/api/AttendanceRepository.ts` |
| Inline mock in `inventory/page.tsx` | `data/api/InventoryRepository.ts` |
| Inline mock in `departments/page.tsx` | `data/api/DepartmentRepository.ts` |
| Inline mock in `messaging/page.tsx` | `data/api/MessagingRepository.ts` |
