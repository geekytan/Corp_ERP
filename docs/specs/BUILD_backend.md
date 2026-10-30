# BUILD_backend.md — Backend Agent

> ⚠️ AGENT INSTRUCTIONS: You are building ONLY the items in this file. Nothing else. Build exactly as specified. Read `BUILD.md` fully first (especially §5 Business Rules, §6 API Contract, §7 Types, §8 Validation). If anything is unclear, output `// UNCLEAR: [question]` and stop.

Run this agent SECOND, after `BUILD_database.md` is complete (database seeded, `db`, `env`, `date`, `types` exist).

---

## Your Scope

All server logic: auth, RBAC, validation, business rules, and every route under `src/app/api/`.

## Your Files

| File | Purpose |
|---|---|
| `src/lib/http.ts` | `HttpError`, `ok()`, `handle()` wrapper |
| `src/lib/auth.ts` | JWT sign/verify, cookie helpers, `getSession()` |
| `src/lib/rbac.ts` | `requireSession(roles?)` and permission helpers |
| `src/lib/validators.ts` | All Zod schemas (also imported by frontend forms) |
| `src/lib/mappers.ts` | DB rows → DTOs (Decimal → number, Date → string) |
| `src/lib/leave.ts` | `ensureLeaveBalances`, leave rules |
| `src/lib/attendance.ts` | `computeMonthlyAttendance` |
| `src/lib/payroll.ts` | `generatePayroll` |
| `src/app/api/**/route.ts` | All routes in BUILD.md §10 |

## Imports you rely on (already built)
`db` from `@/lib/db`, `env` from `@/lib/env`, everything from `@/lib/date`, all types from `@/lib/types`.

---

## Your Tasks (ordered)

### Task 1: HTTP helpers — `src/lib/http.ts`
- Export `class HttpError extends Error { constructor(public status: number, message: string, public fieldErrors?: Record<string,string[]>) }`.
- Export `ok<T>(data: T, status = 200): NextResponse` returning `{ data }`.
- Export `handle(fn: () => Promise<NextResponse>): Promise<NextResponse>`:
  - catches `HttpError` → `{ error: { message, fieldErrors? } }` with its status;
  - catches `ZodError` → 400 `{ error: { message: "Validation failed", fieldErrors: err.flatten().fieldErrors } }`;
  - catches anything else → `console.error(err)` then 500 `{ error: { message: "Internal server error" } }`.
- Export `parseBody<T>(req: Request, schema: ZodSchema<T>): Promise<T>`: reads JSON (invalid JSON → `HttpError(400, "Invalid JSON body")`), then `schema.parse`.
- Acceptance criteria: unit-checked by calling a route that throws each error type (done in Task 11 curl checks).

### Task 2: Auth — `src/lib/auth.ts`
- Constants: cookie name `corperp_token`, expiry 8 hours.
- `signToken(payload: { sub: string; employeeId: string; role: Role }): Promise<string>` using `jose` `SignJWT`, HS256, secret `new TextEncoder().encode(env.AUTH_SECRET)`.
- `verifyToken(token: string)` → payload or `null` (never throws).
- `setAuthCookie(token)` / `clearAuthCookie()` using `await cookies()` from `next/headers`: httpOnly, sameSite `"lax"`, path `"/"`, `secure: process.env.NODE_ENV === "production"`, `maxAge: 8*60*60` (clear = `maxAge: 0`).
- `getSession(): Promise<SessionUser | null>`: reads cookie, verifies, loads `User` with `employee` from DB; returns `null` if missing, user inactive (`isActive === false`), or employee status INACTIVE. Returns `{ id, email, role, employeeId, name: "First Last" }`. (Role comes from the DB row, not the token.)
- `hashPassword(p)` → `bcryptjs.hash(p, 10)`; `verifyPassword(p, hash)` → `bcryptjs.compare`.
- Acceptance criteria: after login, `GET /api/auth/me` returns the user; with a tampered cookie returns 401.

### Task 3: RBAC — `src/lib/rbac.ts`
- `requireSession(roles?: Role[]): Promise<SessionUser>`: `getSession()`; none → `HttpError(401, "Not authenticated")`; if `roles` given and role not included → `HttpError(403, "You do not have permission to perform this action")`.
- `isAdminOrHr(role: Role): boolean`.
- `canViewEmployee(session: SessionUser, target: { id: string; managerId: string | null }): boolean` — ADMIN/HR true; MANAGER true if `target.id === session.employeeId || target.managerId === session.employeeId`; EMPLOYEE true only if `target.id === session.employeeId`.
- `canViewSalary(session, targetEmployeeId): boolean` — ADMIN/HR true; otherwise only self.
- Acceptance criteria: matches the permission table in BUILD.md §5.5.

### Task 4: Validators — `src/lib/validators.ts`
- Zod schemas per BUILD.md §8, exporting exactly: `loginSchema`, `changePasswordSchema`, `departmentSchema`, `createEmployeeSchema`, `updateEmployeeSchema`, `salarySchema`, `statusSchema`, `leaveRequestSchema`, `leaveDecisionSchema`, `payrollRunSchema`, `monthYearQuerySchema` (month, year coerced from query strings via `z.coerce.number().int()`).
- This file must contain ZERO server-only imports (no `db`, no `next/headers`) because the frontend imports it.
- Acceptance criteria: `npx tsc --noEmit` passes; each schema's inferred type is assignable to the matching interface in `types.ts` (`CreateEmployeeInput`, `UpdateEmployeeInput`, `SalaryDto`).

### Task 5: Mappers — `src/lib/mappers.ts`
- `num(d: Prisma.Decimal | number): number` → `Number(d)`.
- Functions that convert Prisma rows (with required includes) to the DTOs in `types.ts`: `toEmployeeListItem`, `toEmployeeDetail(row, includeSalary: boolean)`, `toSalaryDto`, `toAttendanceDto`, `toLeaveRequestDto`, `toPayslipDto`, `toPayrollRunDto`.
- Date-only fields → `fromDateOnly(...)`; timestamps → `.toISOString()`; names → `"First Last"`.
- Export the matching Prisma `include` constants (e.g. `employeeInclude`, `leaveRequestInclude`, `payslipInclude`) so routes reuse them.
- Acceptance criteria: no Decimal or Date object ever appears in any API response.

### Task 6: Leave rules — `src/lib/leave.ts`
- `ensureLeaveBalances(employeeId: string, year: number, tx = db)`: for every `LeaveType` with `isPaid = true`, create the `LeaveBalance` row if missing (`allocated = annualQuota`, `used = 0`). Use `createMany({ skipDuplicates: true })`.
- `getLeaveBalances(employeeId: string, year: number): Promise<LeaveBalanceDto[]>`: calls `ensureLeaveBalances`, returns rows (include leaveType) ordered by leave type name, `remaining = allocated - used`.
- `applyForLeave(session: SessionUser, input)`: implements every rule in BUILD.md §5.3 "days", "overlap", "balance" (in the stated order: date order → no-working-days → year span → overlap → balance), creates the request (status PENDING) and returns `LeaveRequestDto`. Leave type not found → `HttpError(404, "Leave type not found")`.
- `decideLeave(session, id, decision, comment)` and `cancelLeave(session, id)`: implement BUILD.md §5.3 exactly, including the transaction on approval.
- Acceptance criteria: each error message and status code in §5.3 is reproducible (see Task 11 checks).

### Task 7: Attendance computation — `src/lib/attendance.ts`
- `computeMonthlyAttendance(employeeId: string, month: number, year: number): Promise<{ totalWeekdays; countedDays; presentDays; halfDays; presentEq; paidLeaveDays; unpaidLeaveDays; absentDays; lopDays }>` implementing BUILD.md §5.4 **exactly** (variable names and formulas as written). Load the employee's `joinDate`, attendance rows for the month, and APPROVED leave requests overlapping the month (include `leaveType`). Compute leave days by iterating `eachWeekday(max(rangeStart, req.start), min(rangeEnd, req.end))` and adding to a `Set<string>` per paid/unpaid category so a calendar day is never counted twice.
- Also export `computeMonthlyAttendanceBulk(month, year)` returning rows for all ACTIVE employees (reuse the single function in a loop with `Promise.all`; acceptable for 12 employees).
- Acceptance criteria: for the seeded data, results satisfy `lopDays >= absentDays` and `countedDays >= presentEq` for no-leave employees; for a month fully in the future, `countedDays = 0` and `lopDays = 0`.

### Task 8: Payroll — `src/lib/payroll.ts`
- `generatePayroll(session: SessionUser, month: number, year: number): Promise<PayrollRunDto>` implementing BUILD.md §5.4 "Payroll per employee" and "Payroll run rules" exactly, inside one `db.$transaction`. Period-in-future check: compare `(year, month)` with `todayIST()`'s year and month (future if later). Use `computeMonthlyAttendance` for day counts. Use `round2` defined locally in this file as written in §5.4. Store `presentDays = presentEq`.
- `export function round2(x: number): number`.
- Acceptance criteria: for one seeded employee (Sneha Iyer, basic 60000), gross = 60000 + 24000 + 6000 = 90000; `pfDeduction = 7200`; `taxDeduction = 4500`; and `netPay = 90000 - 7200 - 4500 - lopDeduction`, where `lopDeduction = round2(90000 / totalWeekdays * lopDays)`.

### Task 9: Routes — Auth, Departments, Employees
Create route files listed in BUILD.md §10 and behave exactly per §6. Every handler body is wrapped as `return handle(async () => { ... })`.
- **Auth routes:** login looks up user by lowercased email, `verifyPassword`, inactive → same 401 message. Sets cookie, returns `SessionUser`. Logout clears cookie. `me` uses `requireSession()`. `change-password` verifies current password then updates hash.
- **Departments routes:** list includes `_count.employees` → `employeeCount`. Prisma unique error `P2002` → 409 message per contract. Delete blocked if employees exist.
- **Employees routes:**
  - List: filters per contract; `search` is an `OR` of `contains` (mode `insensitive`) on `firstName`, `lastName`, `empCode`, `user.email`; MANAGER restricted to `{ OR: [{ managerId: me }, { id: me }] }`; EMPLOYEE → 403. Ordered by `empCode`. Paginated.
  - Create: transaction per BUILD.md §6 "Create employee behavior". `manager` must exist and be ACTIVE (else 400 `"Selected manager is invalid"`); `department` must exist (else 400 `"Selected department is invalid"`).
  - Update: same validations; email change checks uniqueness; role change rules (HR cannot set or modify an ADMIN's role → 403 `"Only an admin can assign or change the admin role"`); `managerId` equal to own id → 400 `"An employee cannot be their own manager"`. Updates `User.role` and `User.email`.
  - Salary PUT: upsert `SalaryStructure`.
  - Status PATCH: updates `Employee.status` and `User.isActive` (`isActive = status === "ACTIVE"`) in one transaction.
  - Detail: `salary` included only if `canViewSalary`.
- Acceptance criteria: all rows in BUILD.md §6 Auth/Departments/Employees tables behave as specified (checked in Task 11).

### Task 10: Routes — Attendance, Leave, Payroll, Payslips, Dashboard
- **Attendance:** `today`, `check-in`, `check-out` per BUILD.md §5.2 (today = `todayIST()`; `date` stored with `toDateOnly`). `GET /api/attendance` and `/summary` per §6 (summary uses `computeMonthlyAttendanceBulk` mapped to `AttendanceSummaryRow`).
- **Leave:** `leave-types` (ordered by name), `leave-balances`, `leave-requests` (GET scopes + POST), `decision`, `cancel` per §5.3/§6.
- **Payroll:** runs list/create/detail/delete, mark-paid per §6. `PayrollRunDto.payslipCount` and `totalNetPay` computed from payslips.
- **Payslips:** `GET /api/payslips` (own; optional `year`), `GET /api/payslips/:id` (owner or ADMIN/HR; else 403).
- **Dashboard:** `GET /api/dashboard` per §7 types:
  - `ADMIN_HR`: `totalEmployees` (all), `activeEmployees`, `presentToday` (attendance rows today), `onLeaveToday` (APPROVED requests with `startDate <= today <= endDate`, counted only if today is a weekday, distinct employees), `pendingLeaveRequests` (PENDING requests excluding the viewer's own), `departmentHeadcount` (ACTIVE employees per department, ordered by name, including departments with 0), `attendanceLast7Days` (last 7 calendar days ending today, 7 entries, `present` = rows that date), `payrollLast6Runs` (latest 6 runs ordered oldest→newest, `label = monthLabel(month, year)`, `netTotal` = sum of payslip net pay).
  - `MANAGER`: `teamSize` (ACTIVE direct reports), `teamPresentToday`, `teamOnLeaveToday`, `pendingApprovals` (PENDING requests of direct reports).
  - `EMPLOYEE`: `leaveBalances` (current year), `pendingRequests` (own PENDING count), `latestPayslip` (own, newest period, or null).
- Acceptance criteria: all rows in BUILD.md §6 for these groups behave as specified (checked in Task 11).

### Task 11: Manual verification script — `scripts/api-check.md`
- What to build: a markdown file with copy-paste `curl` commands (using `-c cookies.txt -b cookies.txt`) covering each acceptance criterion below. This is documentation only, no code runs it.
- Must include these checks and expected results:
  1. Login as `employee@corperp.com / Password@123` → 200; `GET /api/auth/me` → role EMPLOYEE.
  2. As EMPLOYEE `GET /api/employees` → 403.
  3. As EMPLOYEE check-in → 201; second check-in → 409 `"Already checked in today"`; check-out → 200 with `workedMinutes` ≥ 0.
  4. As EMPLOYEE apply Casual Leave for 2 future weekdays → 201 PENDING; same dates again → 409 overlap message.
  5. As `manager@corperp.com` `GET /api/leave-requests?scope=approvals` shows Sneha's and Kabir's requests; approve Sneha's → APPROVED; `GET /api/leave-balances?employeeId=<sneha>` shows `used` increased by 2.
  6. As MANAGER approve a request of someone not his report → 403.
  7. As `hr@corperp.com` `POST /api/payroll/runs {month: <previous month>, year}` → 201; repeat → 409; `GET /api/payroll/runs/:id` lists 12 payslips (employees ACTIVE with salary); Sneha's payslip matches the Task 8 formula.
  8. As HR `DELETE /api/payroll/runs/:id` → 403; as ADMIN → 200.
  9. As HR create employee with role ADMIN → 403; with role EMPLOYEE → 201 and new employee can log in with `Welcome@123`.
  10. `GET /api/dashboard` returns the correct `view` for each of the 4 roles.
- File(s): `scripts/api-check.md`
- Acceptance criteria: every check passes against the running app.

---

## Contracts You Must Honor
- Every path, method, body, query param, status code, and error message in BUILD.md §6 and §5.
- Response bodies must type-check against `src/lib/types.ts` (import the DTO types and annotate mapper return types with them).
- Money values are JSON numbers. Date-only fields are `"YYYY-MM-DD"`. Timestamps are ISO strings.
- Every authenticated route calls `requireSession(...)` first. No route trusts a role sent by the client.
- Next.js 16: `params` is a Promise; `cookies()` is async.

## DO NOT
- Do not add routes, query params, fields, or error messages that are not in BUILD.md.
- Do not build any UI.
- Do not use raw SQL (`$queryRaw`, `$executeRaw`).
- Do not do your own weekday/timezone math; use `@/lib/date`.
- Do not put secrets or passwords in responses (never return `passwordHash`).
- Do not change the Prisma schema, `types.ts`, or the seed. If a change is needed, output `// UNCLEAR:` and stop.
- Do not implement rate limiting, refresh tokens, password reset, email, or audit logging.
