# BUILD.md — CorpERP (Corporate ERP: HR, Attendance, Leave, Payroll)

> ⚠️ AGENT INSTRUCTIONS: Build ONLY what is listed here. Do not add features, do not infer requirements, do not improve on the spec. If something is unclear, output a comment `// UNCLEAR: [question]` and stop. Do not proceed past unclear points.

---

## 1. Project Overview

CorpERP is a locally-run corporate ERP web application for a single company. It manages employees and departments, daily attendance (self check-in/check-out), leave requests with manager approval, and monthly payroll with printable payslips. It uses a real PostgreSQL database accessed through Prisma. Four roles exist: ADMIN, HR, MANAGER, EMPLOYEE.

This is a solo college project. Priorities: (1) working live demo, (2) clean relational database, (3) material for the written report. Runs only on `localhost`. No deployment.

---

## 2. Tech Stack (exact — install nothing else)

| Concern | Choice |
|---|---|
| Runtime | Node.js 22 LTS |
| Framework | Next.js 16 (App Router) + React 19 + TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL 16 (Docker or local install) |
| ORM | Prisma **6.x** (`prisma` and `@prisma/client`, pin `^6`). Do NOT use Prisma 7. |
| Auth | Custom JWT in httpOnly cookie using `jose` + `bcryptjs` (v3). Do NOT use Auth.js / NextAuth / Better Auth. |
| Validation | `zod` `^3.25` |
| Charts | `recharts` |
| Icons | `lucide-react` |
| Toasts | `sonner` (via shadcn) |
| Dates | `date-fns` (formatting only; all business date logic uses `src/lib/date.ts`) |
| TS runner | `tsx` (dev dependency, used for the seed script) |
| shadcn components allowed | button, input, label, card, table, dialog, select, badge, tabs, sonner, textarea, separator, skeleton, dropdown-menu |

Package manager: **npm**. Do not use `package-lock` alternatives.

### Next.js 16 rules every agent MUST follow
1. In route handlers and pages, `params` is a **Promise**: `{ params }: { params: Promise<{ id: string }> }` then `const { id } = await params;`.
2. `cookies()` from `next/headers` is **async**: `const store = await cookies();`.
3. There is NO `middleware.ts` and NO `proxy.ts` in this project. Route protection is done inside `src/app/(app)/layout.tsx` (server component) and inside each API handler.
4. API route files are `route.ts` and export named functions `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
5. Client components start with `"use client";`.

---

## 3. Environment Variables

File: `.env` (git-ignored). Template: `.env.example` (committed). Owner of both: **Database agent**.

| Variable | Example value | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://corperp:corperp@localhost:5432/corperp?schema=public` | Prisma connection string |
| `AUTH_SECRET` | any random string, minimum 32 characters | Signs JWT cookies |
| `HALF_DAY_THRESHOLD_MINUTES` | `1` | If worked minutes at check-out is below this, status = HALF_DAY. Use `1` for demo (so a quick check-in/out counts as PRESENT). Use `240` for realistic behavior. |
| `DEFAULT_EMPLOYEE_PASSWORD` | `Welcome@123` | Initial password given to newly created employees |
| `COMPANY_NAME` | `CorpERP Pvt. Ltd.` | Shown on payslip header |

All env reads happen only in `src/lib/env.ts` (owner: Database agent), which exports a typed `env` object and throws at import time if `DATABASE_URL` or `AUTH_SECRET` is missing or `AUTH_SECRET.length < 32`.

---

## 4. Data Model (Prisma schema — copy VERBATIM into `prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  HR
  MANAGER
  EMPLOYEE
}

enum EmployeeStatus {
  ACTIVE
  INACTIVE
}

enum AttendanceStatus {
  PRESENT
  HALF_DAY
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum PayslipStatus {
  GENERATED
  PAID
}

model Department {
  id          String     @id @default(cuid())
  name        String     @unique
  description String?
  createdAt   DateTime   @default(now())
  employees   Employee[]

  @@map("departments")
}

model Employee {
  id           String         @id @default(cuid())
  empCode      String         @unique
  firstName    String
  lastName     String
  phone        String?
  designation  String
  joinDate     DateTime       @db.Date
  status       EmployeeStatus @default(ACTIVE)
  departmentId String
  department   Department     @relation(fields: [departmentId], references: [id])
  managerId    String?
  manager      Employee?      @relation("ManagerReports", fields: [managerId], references: [id])
  reports      Employee[]     @relation("ManagerReports")
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  user               User?
  salary             SalaryStructure?
  attendance         Attendance[]
  leaveBalances      LeaveBalance[]
  leaveRequests      LeaveRequest[]  @relation("LeaveApplicant")
  reviewedLeaves     LeaveRequest[]  @relation("LeaveReviewer")
  payslips           Payslip[]
  payrollRunsCreated PayrollRun[]

  @@index([departmentId])
  @@index([managerId])
  @@map("employees")
}

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role     @default(EMPLOYEE)
  isActive     Boolean  @default(true)
  employeeId   String   @unique
  employee     Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())

  @@map("users")
}

model SalaryStructure {
  id         String   @id @default(cuid())
  employeeId String   @unique
  employee   Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  basic      Decimal  @db.Decimal(12, 2)
  hra        Decimal  @db.Decimal(12, 2)
  allowances Decimal  @db.Decimal(12, 2)
  pfPercent  Decimal  @default(12) @db.Decimal(5, 2)
  taxPercent Decimal  @default(5) @db.Decimal(5, 2)
  updatedAt  DateTime @updatedAt

  @@map("salary_structures")
}

model Attendance {
  id            String           @id @default(cuid())
  employeeId    String
  employee      Employee         @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  date          DateTime         @db.Date
  checkIn       DateTime
  checkOut      DateTime?
  workedMinutes Int              @default(0)
  status        AttendanceStatus @default(PRESENT)

  @@unique([employeeId, date])
  @@index([date])
  @@map("attendance")
}

model LeaveType {
  id          String         @id @default(cuid())
  name        String         @unique
  annualQuota Int
  isPaid      Boolean        @default(true)
  balances    LeaveBalance[]
  requests    LeaveRequest[]

  @@map("leave_types")
}

model LeaveBalance {
  id          String    @id @default(cuid())
  employeeId  String
  employee    Employee  @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  leaveTypeId String
  leaveType   LeaveType @relation(fields: [leaveTypeId], references: [id])
  year        Int
  allocated   Int
  used        Int       @default(0)

  @@unique([employeeId, leaveTypeId, year])
  @@map("leave_balances")
}

model LeaveRequest {
  id            String      @id @default(cuid())
  employeeId    String
  employee      Employee    @relation("LeaveApplicant", fields: [employeeId], references: [id], onDelete: Cascade)
  leaveTypeId   String
  leaveType     LeaveType   @relation(fields: [leaveTypeId], references: [id])
  startDate     DateTime    @db.Date
  endDate       DateTime    @db.Date
  days          Int
  reason        String
  status        LeaveStatus @default(PENDING)
  reviewerId    String?
  reviewer      Employee?   @relation("LeaveReviewer", fields: [reviewerId], references: [id])
  reviewComment String?
  createdAt     DateTime    @default(now())
  reviewedAt    DateTime?

  @@index([employeeId])
  @@index([status])
  @@map("leave_requests")
}

model PayrollRun {
  id          String    @id @default(cuid())
  month       Int
  year        Int
  createdById String
  createdBy   Employee  @relation(fields: [createdById], references: [id])
  createdAt   DateTime  @default(now())
  payslips    Payslip[]

  @@unique([month, year])
  @@map("payroll_runs")
}

model Payslip {
  id             String        @id @default(cuid())
  payrollRunId   String
  payrollRun     PayrollRun    @relation(fields: [payrollRunId], references: [id], onDelete: Cascade)
  employeeId     String
  employee       Employee      @relation(fields: [employeeId], references: [id])
  month          Int
  year           Int
  totalWeekdays  Decimal       @db.Decimal(5, 1)
  countedDays    Decimal       @db.Decimal(5, 1)
  presentDays    Decimal       @db.Decimal(5, 1)
  paidLeaveDays  Decimal       @db.Decimal(5, 1)
  lopDays        Decimal       @db.Decimal(5, 1)
  basic          Decimal       @db.Decimal(12, 2)
  hra            Decimal       @db.Decimal(12, 2)
  allowances     Decimal       @db.Decimal(12, 2)
  grossEarnings  Decimal       @db.Decimal(12, 2)
  pfDeduction    Decimal       @db.Decimal(12, 2)
  taxDeduction   Decimal       @db.Decimal(12, 2)
  lopDeduction   Decimal       @db.Decimal(12, 2)
  totalDeductions Decimal      @db.Decimal(12, 2)
  netPay         Decimal       @db.Decimal(12, 2)
  status         PayslipStatus @default(GENERATED)
  paidAt         DateTime?
  createdAt      DateTime      @default(now())

  @@unique([payrollRunId, employeeId])
  @@index([employeeId])
  @@map("payslips")
}
```

---

## 5. Business Rules (EXACT — these are law)

### 5.1 Dates and time
- Company timezone is fixed: `Asia/Kolkata` (IST). Never use the server's local timezone.
- All **date-only** fields (`joinDate`, `Attendance.date`, `LeaveRequest.startDate/endDate`) are stored as Postgres `DATE` and travel through the API as `"YYYY-MM-DD"` strings.
- All **timestamps** (`checkIn`, `checkOut`, `createdAt`, `reviewedAt`, `paidAt`) travel through the API as ISO-8601 UTC strings.
- A "weekday" means Monday–Friday. Saturday and Sunday are non-working. There are no public holidays in the system.
- All date helper functions live ONLY in `src/lib/date.ts` (spec in `BUILD_database.md`, Task 6). No other file may do its own weekday or timezone math.

### 5.2 Attendance
- `POST check-in`: creates a row for today's IST date with `checkIn = now`, status `PRESENT`, `workedMinutes = 0`. If a row already exists for today → `409 "Already checked in today"`.
- `POST check-out`: requires a row for today. If none → `409 "You have not checked in today"`. If `checkOut` already set → `409 "Already checked out today"`. Otherwise sets `checkOut = now`, `workedMinutes = floor((checkOut − checkIn) / 60000)`, and `status = HALF_DAY` if `workedMinutes < HALF_DAY_THRESHOLD_MINUTES`, else `PRESENT`.
- Only employees with `status = ACTIVE` can check in. Inactive → `403 "Your account is inactive"`.
- A missing attendance row on a weekday (with no approved leave) means the employee was **absent**. No rows are created for absences.

### 5.3 Leave
- Seeded leave types (exact): `Casual Leave` quota 12 paid; `Sick Leave` quota 10 paid; `Earned Leave` quota 15 paid; `Leave Without Pay` quota 0 **unpaid**.
- `days` of a request = number of weekdays in `[startDate, endDate]` inclusive. If `days < 1` → `400 "Selected range contains no working days"`. If `endDate < startDate` → `400 "End date cannot be before start date"`. If start and end are in different calendar years → `400 "Leave request cannot span two calendar years"`.
- Overlap rule: a new request is rejected with `409 "You already have a pending or approved leave overlapping these dates"` if any of the employee's requests with status PENDING or APPROVED overlaps the range.
- Balance rule (paid types only): `remaining = allocated − used` for the request's year. If `days > remaining` → `400 "Insufficient leave balance"`. Unpaid type (`isPaid = false`) skips this check.
- Balance rows are created per employee, per year, for every **paid** leave type, with `allocated = annualQuota`. Helper `ensureLeaveBalances(employeeId, year)` creates any missing rows. It is called on employee creation (current year) and on leave application (request year).
- Who may review a request: the applicant's direct manager (`applicant.managerId === reviewer.employeeId`), or any user with role HR or ADMIN. Nobody may review their own request → `403 "You cannot review your own request"`. Others → `403 "You are not allowed to review this request"`.
- Only `PENDING` requests can be decided or cancelled. Otherwise `409 "Request already processed"`.
- On APPROVED with a paid type: in one DB transaction, re-check remaining ≥ days (else `409 "Insufficient leave balance"`), set `used = used + days`, set status, `reviewerId`, `reviewComment`, `reviewedAt = now`. On REJECTED: set status, reviewer fields only.
- Only the applicant may cancel, and only while PENDING (status → CANCELLED, no balance change).
- Approving a leave does NOT create attendance rows. Leave days are derived from `LeaveRequest` at read time.

### 5.4 Attendance summary & payroll math (single shared implementation)
Implemented once as `computeMonthlyAttendance(employeeId, month, year)` in `src/lib/attendance.ts`. Payroll and attendance reports MUST both call it. Definitions (all day-counts are numbers, one decimal allowed):

```
monthStart      = first day of month
monthEnd        = last day of month
totalWeekdays   = weekdays in [monthStart, monthEnd]
rangeStart      = max(monthStart, employee.joinDate)
rangeEnd        = min(monthEnd, todayIST)
countedDays     = weekdays in [rangeStart, rangeEnd]   (0 if rangeStart > rangeEnd)
presentDays     = count of Attendance rows, status PRESENT, date is a weekday within [rangeStart, rangeEnd]
halfDays        = count of Attendance rows, status HALF_DAY, same date filter
presentEq       = presentDays + 0.5 * halfDays
paidLeaveDays   = weekdays inside [rangeStart, rangeEnd] covered by APPROVED requests whose leaveType.isPaid = true (each calendar day counted once)
unpaidLeaveDays = same but isPaid = false
lopDays         = max(0, countedDays - presentEq - paidLeaveDays)
absentDays      = max(0, countedDays - presentEq - paidLeaveDays - unpaidLeaveDays)
```

Payroll per employee (Employee must be ACTIVE and have a SalaryStructure; otherwise skipped):

```
gross           = basic + hra + allowances
perDay          = gross / totalWeekdays
lopDeduction    = round2(perDay * lopDays)
pfDeduction     = round2(basic * pfPercent / 100)
taxDeduction    = round2(gross * taxPercent / 100)
totalDeductions = pfDeduction + taxDeduction + lopDeduction
netPay          = gross - totalDeductions
round2(x)       = Math.round((x + Number.EPSILON) * 100) / 100
```

Payroll run rules:
- `POST /api/payroll/runs {month, year}`: month 1–12; period must not be in the future (`400 "Cannot run payroll for a future month"`); a run for the same month+year already existing → `409 "Payroll already generated for this month"`; zero eligible employees → `400 "No eligible employees for this period"`.
- Run + all payslips are created in one transaction. Payslip stores a snapshot of salary figures and day counts at that time.
- Employees whose `joinDate` is after `monthEnd` are skipped.
- Deleting a run (ADMIN only) deletes its payslips (cascade). This is how a re-run is done.

### 5.5 Roles & permissions (exact)

| Capability | ADMIN | HR | MANAGER | EMPLOYEE |
|---|---|---|---|---|
| Login, change own password | ✅ | ✅ | ✅ | ✅ |
| View dashboard (own view) | ✅ | ✅ | ✅ | ✅ |
| Own attendance check-in/out & history | ✅ | ✅ | ✅ | ✅ |
| Own leave apply/cancel/view, own balances | ✅ | ✅ | ✅ | ✅ |
| Own payslips | ✅ | ✅ | ✅ | ✅ |
| View departments | ✅ | ✅ | ✅ | ✅ |
| Create/edit/delete departments | ✅ | ✅ | ❌ | ❌ |
| List/view employees | all | all | direct reports + self | self only (detail), no list |
| Create/edit employees, salary, status | ✅ | ✅ (cannot set/modify role ADMIN) | ❌ | ❌ |
| View salary of an employee | ✅ | ✅ | ❌ | self only |
| View attendance of others | all | all | direct reports | ❌ |
| Attendance monthly summary report | all | all | ❌ | ❌ |
| Review leave requests | all (except own) | all (except own) | direct reports only | ❌ |
| Run payroll / view runs / mark paid | ✅ | ✅ | ❌ | ❌ |
| Delete payroll run | ✅ | ❌ | ❌ | ❌ |

---

## 6. API Contract

**Base:** all routes under `/api`. JSON in, JSON out. Auth = cookie `corperp_token` (JWT HS256, 8h expiry, payload `{ sub: userId, employeeId, role }`, httpOnly, sameSite `lax`, path `/`, `secure` only when `NODE_ENV === "production"`). On every authenticated request, the user row is reloaded and `isActive` is checked (inactive → 401).

**Success:** `{ "data": <T> }` with HTTP 200 (201 for creates).
**Error:** `{ "error": { "message": string, "fieldErrors"?: Record<string,string[]> } }`.
**Status codes:** 400 validation/business rule, 401 not logged in / inactive, 403 role not allowed, 404 not found, 409 conflict/state, 500 unexpected (message exactly `"Internal server error"`).
**Validation failure** → 400 with `message: "Validation failed"` and `fieldErrors` from Zod flatten.
**Unknown id** → 404 with `"<Resource> not found"` (e.g. `"Employee not found"`).
**Not logged in** → 401 `"Not authenticated"`. **Wrong role** → 403 `"You do not have permission to perform this action"`.

### Auth
| Method | Path | Body | Response `data` | Access |
|---|---|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` | `SessionUser` (sets cookie) | public. Bad credentials or inactive → 401 `"Invalid email or password"` |
| POST | `/api/auth/logout` | – | `{ ok: true }` (clears cookie) | any |
| GET | `/api/auth/me` | – | `SessionUser` | authenticated |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword }` (new ≥ 8 chars) | `{ ok: true }` | authenticated. Wrong current → 400 `"Current password is incorrect"` |

### Departments
| Method | Path | Body | Response `data` | Access |
|---|---|---|---|---|
| GET | `/api/departments` | – | `DepartmentDto[]` (ordered by name) | authenticated |
| POST | `/api/departments` | `{ name, description? }` | `DepartmentDto` (201) | ADMIN, HR. Duplicate name → 409 `"Department name already exists"` |
| PUT | `/api/departments/:id` | `{ name, description? }` | `DepartmentDto` | ADMIN, HR |
| DELETE | `/api/departments/:id` | – | `{ ok: true }` | ADMIN, HR. Has employees → 409 `"Cannot delete a department that has employees"` |

### Employees
| Method | Path | Body / Query | Response `data` | Access |
|---|---|---|---|---|
| GET | `/api/employees` | query: `search?` (matches name, empCode, email, case-insensitive), `departmentId?`, `status?`, `page?` (default 1), `pageSize?` (default 10, max 100) | `Paginated<EmployeeListItem>` | ADMIN, HR (all); MANAGER (reports + self); EMPLOYEE → 403 |
| GET | `/api/employees/options` | – | `{ id, name, empCode }[]` (ACTIVE employees ordered by name) | ADMIN, HR |
| GET | `/api/employees/:id` | – | `EmployeeDetail` (`salary` is `null` unless viewer is ADMIN/HR or self) | ADMIN, HR any; MANAGER reports + self; EMPLOYEE self only. Else 403 |
| POST | `/api/employees` | `CreateEmployeeInput` | `EmployeeDetail` (201) | ADMIN, HR |
| PUT | `/api/employees/:id` | `UpdateEmployeeInput` | `EmployeeDetail` | ADMIN, HR |
| PUT | `/api/employees/:id/salary` | `SalaryDto` | `SalaryDto` | ADMIN, HR |
| PATCH | `/api/employees/:id/status` | `{ status: "ACTIVE" \| "INACTIVE" }` | `EmployeeDetail` | ADMIN, HR. Cannot deactivate self → 400 `"You cannot deactivate your own account"` |

Create employee behavior (one DB transaction): create `Employee` (auto `empCode` = `"EMP"` + (highest existing numeric suffix + 1) zero-padded to 3 digits), create `User` (email lowercased, password = `DEFAULT_EMPLOYEE_PASSWORD` bcrypt-hashed with cost 10, role from input), create `SalaryStructure`, then `ensureLeaveBalances(employeeId, currentYear)`. Duplicate email → 409 `"Email already in use"`. Role `ADMIN` can only be set by an ADMIN (HR → 403).

### Attendance
| Method | Path | Body / Query | Response `data` | Access |
|---|---|---|---|---|
| GET | `/api/attendance/today` | – | `AttendanceRecordDto \| null` (own, today IST) | authenticated |
| POST | `/api/attendance/check-in` | – | `AttendanceRecordDto` (201) | authenticated |
| POST | `/api/attendance/check-out` | – | `AttendanceRecordDto` | authenticated |
| GET | `/api/attendance` | query: `month` (1–12, required), `year` (required), `employeeId?` | `AttendanceRecordDto[]` ordered by date desc, then empCode | EMPLOYEE: self only (other id → 403). MANAGER: self or a direct report (other → 403); without `employeeId` → self. ADMIN/HR: any; without `employeeId` → all employees |
| GET | `/api/attendance/summary` | query: `month`, `year` | `AttendanceSummaryRow[]` (all ACTIVE employees, ordered by empCode) | ADMIN, HR |

### Leave
| Method | Path | Body / Query | Response `data` | Access |
|---|---|---|---|---|
| GET | `/api/leave-types` | – | `LeaveTypeDto[]` | authenticated |
| GET | `/api/leave-balances` | query: `employeeId?`, `year?` (default current IST year) | `LeaveBalanceDto[]` | self default; MANAGER may pass a report's id; ADMIN/HR any; otherwise 403. Calls `ensureLeaveBalances` first |
| POST | `/api/leave-requests` | `{ leaveTypeId, startDate, endDate, reason }` (reason 3–300 chars) | `LeaveRequestDto` (201) | authenticated (applies for self) |
| GET | `/api/leave-requests` | query: `scope` = `mine` \| `approvals` (required), `status?` | `LeaveRequestDto[]` newest first | `mine`: anyone. `approvals`: MANAGER (requests of direct reports), ADMIN/HR (all except own). EMPLOYEE + approvals → 403 |
| PATCH | `/api/leave-requests/:id/decision` | `{ decision: "APPROVED" \| "REJECTED", comment? }` | `LeaveRequestDto` | per 5.3 |
| PATCH | `/api/leave-requests/:id/cancel` | – | `LeaveRequestDto` | applicant only |

### Payroll
| Method | Path | Body | Response `data` | Access |
|---|---|---|---|---|
| GET | `/api/payroll/runs` | – | `PayrollRunDto[]` (year desc, month desc) | ADMIN, HR |
| POST | `/api/payroll/runs` | `{ month, year }` | `PayrollRunDto` (201) | ADMIN, HR |
| GET | `/api/payroll/runs/:id` | – | `{ run: PayrollRunDto, payslips: PayslipDto[] }` (payslips ordered by empCode) | ADMIN, HR |
| DELETE | `/api/payroll/runs/:id` | – | `{ ok: true }` | ADMIN only |
| PATCH | `/api/payroll/payslips/:id/pay` | – | `PayslipDto` (status PAID, `paidAt = now`). Already paid → 409 `"Payslip already marked as paid"` | ADMIN, HR |
| GET | `/api/payslips` | query: `year?` | `PayslipDto[]` (own, newest period first) | authenticated |
| GET | `/api/payslips/:id` | – | `PayslipDto` | owner, or ADMIN/HR. Else 403 |

### Dashboard
| Method | Path | Response `data` | Access |
|---|---|---|---|
| GET | `/api/dashboard` | `DashboardDto` (shape depends on role, see types) | authenticated |

---

## 7. Shared TypeScript Types (copy VERBATIM into `src/lib/types.ts`)

```ts
export type Role = "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";
export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type AttendanceStatus = "PRESENT" | "HALF_DAY";
export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type PayslipStatus = "GENERATED" | "PAID";

export interface ApiSuccess<T> { data: T }
export interface ApiError { error: { message: string; fieldErrors?: Record<string, string[]> } }
export interface Paginated<T> { items: T[]; total: number; page: number; pageSize: number }

export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  employeeId: string;
  name: string; // "First Last"
}

export interface DepartmentDto {
  id: string;
  name: string;
  description: string | null;
  employeeCount: number;
}

export interface SalaryDto {
  basic: number;
  hra: number;
  allowances: number;
  pfPercent: number;
  taxPercent: number;
}

export interface EmployeeListItem {
  id: string;
  empCode: string;
  name: string;
  email: string;
  designation: string;
  departmentId: string;
  departmentName: string;
  managerName: string | null;
  status: EmployeeStatus;
  role: Role;
  joinDate: string; // YYYY-MM-DD
}

export interface EmployeeDetail extends EmployeeListItem {
  firstName: string;
  lastName: string;
  phone: string | null;
  managerId: string | null;
  salary: SalaryDto | null;
}

export interface CreateEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  designation: string;
  departmentId: string;
  managerId?: string | null;
  joinDate: string; // YYYY-MM-DD
  role: Role;
  basic: number;
  hra: number;
  allowances: number;
  pfPercent: number;
  taxPercent: number;
}

export interface UpdateEmployeeInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  designation: string;
  departmentId: string;
  managerId?: string | null;
  joinDate: string;
  role: Role;
}

export interface AttendanceRecordDto {
  id: string;
  employeeId: string;
  employeeName: string;
  empCode: string;
  date: string; // YYYY-MM-DD
  checkIn: string; // ISO
  checkOut: string | null; // ISO
  workedMinutes: number;
  status: AttendanceStatus;
}

export interface AttendanceSummaryRow {
  employeeId: string;
  employeeName: string;
  empCode: string;
  totalWeekdays: number;
  countedDays: number;
  presentDays: number;
  halfDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  lopDays: number;
}

export interface LeaveTypeDto {
  id: string;
  name: string;
  annualQuota: number;
  isPaid: boolean;
}

export interface LeaveBalanceDto {
  leaveTypeId: string;
  leaveTypeName: string;
  isPaid: boolean;
  year: number;
  allocated: number;
  used: number;
  remaining: number;
}

export interface LeaveRequestDto {
  id: string;
  employeeId: string;
  employeeName: string;
  empCode: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewerName: string | null;
  reviewComment: string | null;
  createdAt: string; // ISO
  reviewedAt: string | null; // ISO
}

export interface PayrollRunDto {
  id: string;
  month: number;
  year: number;
  createdByName: string;
  createdAt: string; // ISO
  payslipCount: number;
  totalNetPay: number;
}

export interface PayslipDto {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  empCode: string;
  designation: string;
  departmentName: string;
  month: number;
  year: number;
  totalWeekdays: number;
  countedDays: number;
  presentDays: number; // presentEq (half days count 0.5)
  paidLeaveDays: number;
  lopDays: number;
  basic: number;
  hra: number;
  allowances: number;
  grossEarnings: number;
  pfDeduction: number;
  taxDeduction: number;
  lopDeduction: number;
  totalDeductions: number;
  netPay: number;
  status: PayslipStatus;
  paidAt: string | null; // ISO
}

export interface AdminHrDashboard {
  view: "ADMIN_HR";
  totalEmployees: number;
  activeEmployees: number;
  presentToday: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  departmentHeadcount: { name: string; count: number }[];
  attendanceLast7Days: { date: string; present: number }[]; // oldest → newest, 7 entries
  payrollLast6Runs: { label: string; netTotal: number }[]; // label "Sep 2026", oldest → newest, up to 6
}

export interface ManagerDashboard {
  view: "MANAGER";
  teamSize: number;
  teamPresentToday: number;
  teamOnLeaveToday: number;
  pendingApprovals: number;
}

export interface EmployeeDashboard {
  view: "EMPLOYEE";
  leaveBalances: LeaveBalanceDto[];
  pendingRequests: number;
  latestPayslip: PayslipDto | null;
}

export type DashboardDto = AdminHrDashboard | ManagerDashboard | EmployeeDashboard;
// Role → view: ADMIN & HR → ADMIN_HR, MANAGER → MANAGER, EMPLOYEE → EMPLOYEE.
```

---

## 8. Validation Rules (Zod, exact — live in `src/lib/validators.ts`)

| Field | Rule |
|---|---|
| email | valid email, trimmed, lowercased, max 120 |
| password (login) | non-empty string |
| newPassword | min 8, max 72 |
| firstName / lastName | trimmed, 1–50 chars |
| phone | optional/nullable; regex `^[0-9+\-\s]{7,15}$` |
| designation | trimmed, 2–80 |
| department name | trimmed, 2–60; description optional, max 200 |
| joinDate, startDate, endDate | regex `^\d{4}-\d{2}-\d{2}$` and a real calendar date |
| role | one of ADMIN, HR, MANAGER, EMPLOYEE |
| basic | number > 0, max 10,000,000 |
| hra, allowances | number ≥ 0, max 10,000,000 |
| pfPercent, taxPercent | number 0–100 |
| month | integer 1–12; year integer 2000–2100 |
| leave reason | trimmed, 3–300 |
| review comment | optional, max 300 |

---

## 9. Seed Data (exact — implemented by Database agent)

All seeded users share password `Password@123`.

**Departments:** Engineering, Human Resources, Finance, Sales, Operations.

| empCode | Name | Email | Role | Department | Designation | Manager | Basic |
|---|---|---|---|---|---|---|---|
| EMP001 | Aarav Mehta | admin@corperp.com | ADMIN | Operations | System Administrator | – | 90000 |
| EMP002 | Priya Sharma | hr@corperp.com | HR | Human Resources | HR Manager | EMP001 | 70000 |
| EMP003 | Rohan Verma | manager@corperp.com | MANAGER | Engineering | Engineering Manager | EMP001 | 110000 |
| EMP004 | Sneha Iyer | employee@corperp.com | EMPLOYEE | Engineering | Software Engineer | EMP003 | 60000 |
| EMP005 | Kabir Khan | kabir@corperp.com | EMPLOYEE | Engineering | Backend Developer | EMP003 | 65000 |
| EMP006 | Ananya Rao | ananya@corperp.com | EMPLOYEE | Engineering | QA Engineer | EMP003 | 45000 |
| EMP007 | Kavita Nair | kavita@corperp.com | MANAGER | Sales | Sales Manager | EMP001 | 85000 |
| EMP008 | Arjun Patel | arjun@corperp.com | EMPLOYEE | Sales | Sales Executive | EMP007 | 40000 |
| EMP009 | Meera Joshi | meera@corperp.com | EMPLOYEE | Sales | Account Executive | EMP007 | 42000 |
| EMP010 | Vikram Singh | vikram@corperp.com | MANAGER | Finance | Finance Manager | EMP001 | 80000 |
| EMP011 | Divya Menon | divya@corperp.com | EMPLOYEE | Finance | Accountant | EMP010 | 48000 |
| EMP012 | Rahul Desai | rahul@corperp.com | EMPLOYEE | Operations | Operations Executive | EMP001 | 38000 |

Salary for each: `hra = basic * 0.40`, `allowances = basic * 0.10`, `pfPercent = 12`, `taxPercent = 5`. All `joinDate = 2025-01-06`. All status ACTIVE.

**Leave types:** as in 5.3. **Leave balances:** `ensureLeaveBalances` for every employee for the current IST year.

**Attendance seed:** for the entire previous calendar month and for the current month up to and including **yesterday** (IST), for every employee, every weekday: use deterministic pseudo-random `mulberry32(seed = employeeIndex * 1000 + dayOfMonth)`. `r < 0.88` → PRESENT (checkIn 09:00 IST, checkOut 18:00 IST, workedMinutes 540). `0.88 ≤ r < 0.93` → HALF_DAY (checkIn 09:00, checkOut 13:30, workedMinutes 270). Otherwise no row (absent). **Never seed a row for today.** Skip any date covered by a seeded APPROVED leave.

**Leave request seed:**
1. Ananya Rao — Casual Leave, 2 weekdays in the previous month (the 8th and 9th if weekdays, otherwise the next two weekdays), reason "Family function", APPROVED by Rohan Verma, balance used += 2.
2. Kabir Khan — Sick Leave, the next two weekdays after today, reason "Medical appointment", PENDING.
3. Arjun Patel — Casual Leave, 1 weekday in the previous month (the 20th or next weekday), reason "Personal work", REJECTED by Kavita Nair, comment "Quarter-end targets".

**No payroll runs are seeded.** Payroll is generated live during the demo.

---

## 10. File Structure (root — do not rename or move)

```
corperp/
├── .env                          (git-ignored)
├── .env.example
├── .gitignore
├── README.md
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── components.json               (shadcn)
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/               (generated by prisma migrate)
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx                         (redirects to /dashboard)
    │   ├── login/page.tsx
    │   ├── (app)/
    │   │   ├── layout.tsx                   (auth guard + shell)
    │   │   ├── dashboard/page.tsx
    │   │   ├── employees/page.tsx
    │   │   ├── employees/new/page.tsx
    │   │   ├── employees/[id]/page.tsx
    │   │   ├── departments/page.tsx
    │   │   ├── attendance/page.tsx
    │   │   ├── leave/page.tsx
    │   │   ├── leave/approvals/page.tsx
    │   │   ├── payroll/page.tsx
    │   │   ├── payroll/[runId]/page.tsx
    │   │   ├── payslips/page.tsx
    │   │   ├── payslips/[id]/page.tsx
    │   │   └── profile/page.tsx
    │   └── api/
    │       ├── auth/login/route.ts
    │       ├── auth/logout/route.ts
    │       ├── auth/me/route.ts
    │       ├── auth/change-password/route.ts
    │       ├── departments/route.ts
    │       ├── departments/[id]/route.ts
    │       ├── employees/route.ts
    │       ├── employees/options/route.ts
    │       ├── employees/[id]/route.ts
    │       ├── employees/[id]/salary/route.ts
    │       ├── employees/[id]/status/route.ts
    │       ├── attendance/route.ts
    │       ├── attendance/today/route.ts
    │       ├── attendance/check-in/route.ts
    │       ├── attendance/check-out/route.ts
    │       ├── attendance/summary/route.ts
    │       ├── leave-types/route.ts
    │       ├── leave-balances/route.ts
    │       ├── leave-requests/route.ts
    │       ├── leave-requests/[id]/decision/route.ts
    │       ├── leave-requests/[id]/cancel/route.ts
    │       ├── payroll/runs/route.ts
    │       ├── payroll/runs/[id]/route.ts
    │       ├── payroll/payslips/[id]/pay/route.ts
    │       ├── payslips/route.ts
    │       ├── payslips/[id]/route.ts
    │       └── dashboard/route.ts
    ├── components/
    │   ├── ui/                              (shadcn generated)
    │   ├── providers/SessionProvider.tsx
    │   ├── layout/Sidebar.tsx
    │   ├── layout/Topbar.tsx
    │   ├── common/PageHeader.tsx
    │   ├── common/StatCard.tsx
    │   ├── common/StatusBadge.tsx
    │   ├── common/EmptyState.tsx
    │   ├── common/LoadingBlock.tsx
    │   ├── common/ConfirmDialog.tsx
    │   ├── attendance/CheckInCard.tsx
    │   ├── employees/EmployeeForm.tsx
    │   └── leave/LeaveRequestsTable.tsx
    ├── hooks/useApi.ts
    └── lib/
        ├── env.ts            (Database agent)
        ├── db.ts             (Database agent)
        ├── date.ts           (Database agent)
        ├── types.ts          (Database agent — verbatim from section 7)
        ├── http.ts           (Backend agent)
        ├── auth.ts           (Backend agent)
        ├── rbac.ts           (Backend agent)
        ├── validators.ts     (Backend agent)
        ├── leave.ts          (Backend agent)
        ├── attendance.ts     (Backend agent)
        ├── payroll.ts        (Backend agent)
        ├── mappers.ts        (Backend agent: DB row → DTO)
        ├── api-client.ts     (Frontend agent)
        └── format.ts         (Frontend agent)
```

---

## 11. npm Scripts (exact, in `package.json`)

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "db:up": "docker compose up -d",
  "db:migrate": "prisma migrate dev",
  "db:seed": "prisma db seed",
  "db:reset": "prisma migrate reset --force",
  "db:studio": "prisma studio",
  "setup": "prisma generate && prisma migrate dev --name init && prisma db seed"
}
```
`package.json` must also contain: `"prisma": { "seed": "tsx prisma/seed.ts" }`.

---

## 12. Ownership Overview

| Agent file | Role | Owns | Integrates With |
|---|---|---|---|
| `BUILD_database.md` | Foundation + Database | project scaffold, `docker-compose.yml`, `prisma/*`, `src/lib/{env,db,date,types}.ts`, `.env.example`, `README.md` | Backend (imports `db`, `date`, `types`, `env`) |
| `BUILD_backend.md` | Backend | `src/lib/{http,auth,rbac,validators,leave,attendance,payroll,mappers}.ts`, everything under `src/app/api/` | Frontend (via API contract + `types.ts` + `validators.ts`) |
| `BUILD_frontend.md` | Frontend | everything under `src/app/**` except `api/`, `src/components/**`, `src/hooks/**`, `src/lib/{api-client,format}.ts` | Backend (via API contract) |

---

## 13. DO NOT Section (applies to all agents)

- Do not add any feature not listed in this document (no email, no file uploads, no dark mode, no i18n, no recruitment, no performance reviews, no expenses, no notifications, no public holidays, no audit log).
- Do not change shared contract definitions (schema, types, API paths, response shapes, error messages, business rules).
- Do not rename or move files or folders.
- Do not install packages not listed in section 2.
- Do not use your own judgment to "improve" the code or design.
- Do not use `localStorage` or `sessionStorage` for auth. Auth is cookie-only.
- Do not use raw SQL. Use Prisma Client only (except `prisma migrate`).
- Do not use `any` in TypeScript; use proper types or `unknown`.
- Do not leave `console.log` in committed code (`console.error` is allowed only inside `handle()` in `http.ts` and in `seed.ts`).
- Do not write tests unless told to (manual test cases are in `INTEGRATION.md`).
