# BUILD_frontend.md — Frontend Agent

> ⚠️ AGENT INSTRUCTIONS: You are building ONLY the items in this file. Nothing else. Build exactly as specified. Read `BUILD.md` fully first (especially §5.5 permissions, §6 API contract, §7 types). If anything is unclear, output `// UNCLEAR: [question]` and stop.

Run this agent THIRD, after `BUILD_backend.md` is complete and `scripts/api-check.md` passes.

---

## Your Scope

Every page, component, hook, and client utility. All data comes from the API in BUILD.md §6. You never touch the database.

## Your Files

| File | Purpose |
|---|---|
| `src/lib/api-client.ts` | Typed fetch wrapper |
| `src/lib/format.ts` | Formatting helpers |
| `src/hooks/useApi.ts` | Data-loading hook |
| `src/components/providers/SessionProvider.tsx` | Client session context |
| `src/components/layout/{Sidebar,Topbar}.tsx` | App shell |
| `src/components/common/*` | PageHeader, StatCard, StatusBadge, EmptyState, LoadingBlock, ConfirmDialog |
| `src/components/attendance/CheckInCard.tsx` | Today check-in/out widget |
| `src/components/employees/EmployeeForm.tsx` | Create/edit employee form |
| `src/components/leave/LeaveRequestsTable.tsx` | Reusable leave table |
| `src/app/login/page.tsx` | Login page |
| `src/app/(app)/layout.tsx` + all pages under `(app)/` | Per BUILD.md §10 |

## Imports you rely on
Types from `@/lib/types`. Zod schemas from `@/lib/validators` (client-safe, for form validation). shadcn components from `@/components/ui/*`. Never import `@/lib/db`, `@/lib/auth`, `@/lib/rbac`, or anything server-only into client components.

---

## Global UI Rules
- Design: clean, professional, light theme only. Neutral/slate palette with one accent (`indigo-600`). Page background `bg-slate-50`; content in white `Card`s.
- Layout: fixed left sidebar (width `w-60`) + top bar + scrolling main area with `p-6`. On screens under `md`, the sidebar is hidden (no mobile menu needed — desktop demo only).
- Every data-driven screen handles 3 states: **loading** (`LoadingBlock`, text "Loading..."), **error** (red text with the API error message and a "Retry" button), **empty** (`EmptyState` with the text given per page).
- Every mutation: disable the submit button while pending, show `toast.success(...)` on success and `toast.error(error.message)` on failure. Field-level errors from `fieldErrors` display under the matching input in `text-sm text-red-600`.
- Print: Sidebar, Topbar, and all buttons on the payslip page use `print:hidden`. Main area uses `print:p-0`.
- Money: always `formatINR`. Dates shown to users: `dd MMM yyyy`. Times: `hh:mm a` in IST.
- Role-based UI: hide (don't just disable) elements the role cannot use, per BUILD.md §5.5. The server is the real guard.

---

## Your Tasks (ordered)

### Task 1: Client utilities
- `src/lib/api-client.ts`: export `class ApiClientError extends Error { status: number; fieldErrors?: Record<string,string[]> }` and an `api` object with `get<T>(url)`, `post<T>(url, body?)`, `put<T>(url, body)`, `patch<T>(url, body?)`, `del<T>(url)`. Each uses `fetch` with `credentials: "same-origin"`, JSON headers, unwraps `{ data }`, and on `{ error }` throws `ApiClientError`. On HTTP 401 (except for `/api/auth/login`) it does `window.location.href = "/login"` before throwing.
- `src/lib/format.ts`: `formatINR(n)` → `Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 })`; `formatDate(yyyyMmDd)` → `"05 Sep 2026"` (parse as UTC date-only, no timezone shift); `formatTime(iso)` → `"09:05 AM"` using `timeZone: "Asia/Kolkata"`; `formatMinutes(m)` → `"9h 05m"`; `monthName(month: number)` → full English name; `MONTH_NAMES` array.
- `src/hooks/useApi.ts`: `useApi<T>(url: string | null)` returns `{ data: T | null, error: string | null, loading: boolean, reload: () => void }`; refetches when `url` changes; `null` url skips fetching.
- Acceptance criteria: `npx tsc --noEmit` passes.

### Task 2: Shell, session, shared components
- `src/components/providers/SessionProvider.tsx`: React context holding `SessionUser`; export `SessionProvider` and `useSession()`.
- `src/app/(app)/layout.tsx` (server component): `const session = await getSession(); if (!session) redirect("/login");` renders `<SessionProvider user={session}>` with `Sidebar`, `Topbar`, and `<main>`. (This file may import `getSession` from `@/lib/auth` — it is the only frontend file allowed to.)
- `Sidebar.tsx` nav (icon from lucide-react + label), shown per role; active link highlighted with `bg-indigo-50 text-indigo-700`:
  | Label | Path | Icon | Roles |
  |---|---|---|---|
  | Dashboard | `/dashboard` | `LayoutDashboard` | all |
  | Employees | `/employees` | `Users` | ADMIN, HR, MANAGER |
  | Departments | `/departments` | `Building2` | ADMIN, HR |
  | Attendance | `/attendance` | `Clock` | all |
  | Leave | `/leave` | `CalendarDays` | all |
  | Leave Approvals | `/leave/approvals` | `CheckCircle2` | ADMIN, HR, MANAGER |
  | Payroll | `/payroll` | `Wallet` | ADMIN, HR |
  | My Payslips | `/payslips` | `FileText` | all |
  | Profile | `/profile` | `User` | all |
  Sidebar header: app name "CorpERP" in bold indigo.
- `Topbar.tsx`: right side shows user name, a role `Badge`, and a "Logout" button (`POST /api/auth/logout` then `window.location.href = "/login"`).
- Common components: `PageHeader({ title, subtitle?, actions? })`, `StatCard({ label, value, icon? })`, `StatusBadge({ status })` (colors: PRESENT/APPROVED/ACTIVE/PAID = green; HALF_DAY/PENDING/GENERATED = amber; REJECTED/INACTIVE = red; CANCELLED = gray), `EmptyState({ message })`, `LoadingBlock()`, `ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel, pending })`.
- Acceptance criteria: after logging in, the shell renders with the correct sidebar items for each of the 4 demo accounts.

### Task 3: Login page — `src/app/login/page.tsx`
- Centered `Card` (max-w-sm) with title "CorpERP", subtitle "Sign in to your account", email + password inputs, "Sign in" button. Submits `POST /api/auth/login`; success → `window.location.href = "/dashboard"`; failure → red message under form (the API message).
- Below the form, a small gray box "Demo accounts" listing the 4 emails (admin@, hr@, manager@, employee@ corperp.com) and "Password: Password@123". Each email is clickable and fills the form.
- If the visitor is already logged in (server side `getSession()` truthy), redirect to `/dashboard` (make the page a server component wrapping a client `LoginForm`).
- Acceptance criteria: wrong password shows "Invalid email or password"; correct login lands on dashboard.

### Task 4: Dashboard — `src/app/(app)/dashboard/page.tsx`
- Fetches `GET /api/dashboard`. Page header "Dashboard" with subtitle "Welcome back, {name}". Always show `CheckInCard` (Task 5) at the top.
- View `ADMIN_HR`: 4 `StatCard`s (Total Employees = `totalEmployees`, Present Today, On Leave Today, Pending Leave Requests). Below, a 2-column grid: Bar chart "Headcount by Department" (`departmentHeadcount`), Line chart "Attendance – Last 7 Days" (`attendanceLast7Days`, x = date formatted `dd MMM`, y = present). Full-width Bar chart "Net Payroll – Last 6 Runs" (`payrollLast6Runs`); if the array is empty, show `EmptyState` "No payroll runs yet". Charts use `recharts` `ResponsiveContainer` height 280, indigo fill `#4f46e5`.
- View `MANAGER`: 4 `StatCard`s (Team Size, Team Present Today, Team On Leave Today, Pending Approvals). A link button "Review approvals" to `/leave/approvals`.
- View `EMPLOYEE`: a grid of `Card`s, one per leave balance (title = leave type, big number = `remaining`, caption "of {allocated} days"); a `Card` "Pending requests" with the count and link to `/leave`; a `Card` "Latest payslip" showing period + net pay + "View" link to `/payslips/{id}`, or text "No payslip yet".
- Acceptance criteria: each role sees only its own view with real numbers from the seeded DB.

### Task 5: Check-in card — `src/components/attendance/CheckInCard.tsx`
- Client component. Loads `GET /api/attendance/today`. Displays today's date (`EEEE, dd MMM yyyy`).
  - No record: text "You have not checked in today" and a primary button "Check In".
  - Record with no `checkOut`: text "Checked in at {time}" and button "Check Out".
  - Record with `checkOut`: text "Checked in {time} • Checked out {time} • Worked {formatMinutes}" with `StatusBadge`, no button.
- Buttons call `POST /api/attendance/check-in` / `check-out`, then reload and toast.
- Props: `onChange?: () => void` (called after a successful action so the parent can reload).
- Acceptance criteria: full cycle works; double click does not create duplicates (button disabled while pending).

### Task 6: Departments page — `src/app/(app)/departments/page.tsx`
- Roles: all authenticated may open it, but add/edit/delete controls only for ADMIN/HR. (Sidebar hides it from others; direct URL access shows the read-only table.)
- `Table` columns: Name, Description, Employees (`employeeCount`), Actions (Edit, Delete — ADMIN/HR only). "Add Department" button opens a `Dialog` with name + description (`Textarea`). Edit uses the same dialog prefilled. Delete uses `ConfirmDialog`; a 409 error shows as toast.
- Empty text: "No departments yet".
- Acceptance criteria: CRUD works; deleting "Engineering" (has employees) shows the 409 message toast.

### Task 7: Employees pages
- `employees/page.tsx`: header "Employees" (MANAGER sees subtitle "Your team"). Toolbar: search `Input` (debounced 300 ms), department `Select` (options from `GET /api/departments`, plus "All departments"), status `Select` (All / Active / Inactive). "Add Employee" button (ADMIN/HR only) → `/employees/new`. `Table` columns: Code, Name, Email, Department, Designation, Manager, Status (`StatusBadge`), row click → `/employees/{id}`. Pagination footer: "Page X of Y", Prev/Next buttons, page size fixed at 10. Empty text: "No employees found".
- `components/employees/EmployeeForm.tsx`: props `{ mode: "create" | "edit"; initial?: EmployeeDetail; onSaved: (e: EmployeeDetail) => void }`. Sections: **Personal** (firstName, lastName, email, phone), **Job** (designation, department `Select`, manager `Select` from `GET /api/employees/options` with "No manager" option, joinDate `type="date"`, role `Select`), **Salary** (basic, hra, allowances, pfPercent, taxPercent — shown in create mode only; edit mode manages salary on the detail page). In the role `Select`, hide `ADMIN` when the session role is HR. Client-side validation with `createEmployeeSchema` / `updateEmployeeSchema` via `safeParse`; display `fieldErrors`.
- `employees/new/page.tsx`: ADMIN/HR only (others see text "You do not have access to this page"). Renders the form in create mode; on success toast "Employee created. Default password: {value}" is NOT shown (do not display passwords) — instead toast "Employee created" and navigate to `/employees/{id}`.
- `employees/[id]/page.tsx` (`params` is a Promise: use `use(params)` from React in this client page): header with name, `empCode`, status badge. Tabs: **Profile** (read-only fields; "Edit" button for ADMIN/HR toggles `EmployeeForm` edit mode), **Salary** (visible only if `salary !== null`: shows the 5 values; ADMIN/HR get an editable form with Save → `PUT /api/employees/{id}/salary`), **Attendance** (this month's records for that employee via `GET /api/attendance?month&year&employeeId`, simple table, visible when viewer is not an EMPLOYEE… i.e. ADMIN/HR/MANAGER or self). ADMIN/HR also see a "Deactivate"/"Activate" button with `ConfirmDialog` → `PATCH /api/employees/{id}/status`.
- Acceptance criteria: HR can add "Test User" → appears in list → can log in with the default password → HR can deactivate → that login now fails.

### Task 8: Attendance page — `src/app/(app)/attendance/page.tsx`
- Top: `CheckInCard`. Below: `Tabs`.
  - Tab **"My / Team Records"** (all roles): month `Select` (Jan–Dec) and year `Select` (current year and previous year), default current month. For ADMIN/HR/MANAGER an extra employee `Select`: ADMIN/HR options from `GET /api/employees/options` plus "All employees"; MANAGER options from `GET /api/employees?pageSize=100` (reports + self) with default = self; EMPLOYEE has no selector. Table columns: Date, Employee (hidden when a single employee is chosen/self-only), Check-in, Check-out, Worked, Status. Empty: "No attendance records for this period".
  - Tab **"Monthly Summary"** (ADMIN/HR only): month/year selectors; table from `GET /api/attendance/summary`: Code, Name, Working Days (`totalWeekdays`), Counted, Present, Half Days, Paid Leave, Unpaid Leave, Absent, LOP Days.
- Acceptance criteria: seeded data shows for the current and previous month; summary rows count 12.

### Task 9: Leave pages
- `components/leave/LeaveRequestsTable.tsx`: props `{ items: LeaveRequestDto[]; showEmployee: boolean; actions?: (r: LeaveRequestDto) => ReactNode }`. Columns: (Employee if `showEmployee`), Type, From, To, Days, Reason, Status (`StatusBadge`), Reviewed By, Comment, Actions.
- `leave/page.tsx`: header "Leave". Top row of balance `Card`s from `GET /api/leave-balances` (type name, "{remaining} / {allocated} left"; for unpaid types show "Unlimited (unpaid)"). "Apply for Leave" button → `Dialog` with: leave type `Select` (from `GET /api/leave-types`), start date, end date, reason `Textarea`; shows a live "Working days: N" line computed on the client (count Mon–Fri between the dates). Submit → `POST /api/leave-requests`. Below: `LeaveRequestsTable` from `GET /api/leave-requests?scope=mine` with a "Cancel" button on PENDING rows (`PATCH .../cancel`, with `ConfirmDialog`). Empty: "You have not applied for any leave".
- `leave/approvals/page.tsx`: ADMIN/HR/MANAGER only (others see "You do not have access to this page"). Status filter `Select` (Pending default / Approved / Rejected / All). Table from `GET /api/leave-requests?scope=approvals&status=...` with `showEmployee`. PENDING rows have "Approve" and "Reject" buttons opening a `Dialog` with an optional comment `Textarea`, then `PATCH .../decision`. Empty: "No leave requests to review".
- Acceptance criteria: Sneha applies → Rohan sees it in approvals → approves → Sneha's table shows APPROVED and her balance card decreases.

### Task 10: Payroll pages (ADMIN/HR)
- `payroll/page.tsx`: others see "You do not have access to this page". Top `Card` "Generate Payroll": month `Select` and year `Select` (current year, previous year; default = previous month), "Generate" button → `POST /api/payroll/runs`; on success toast and navigate to `/payroll/{id}`; on 409/400 show the message as a toast. Below: `Table` of runs from `GET /api/payroll/runs`: Period (`"{monthName} {year}"`), Employees (`payslipCount`), Total Net Pay (`formatINR`), Generated By, Generated On, Actions: "View" (link) and "Delete" (ADMIN only, `ConfirmDialog` with text "This deletes all payslips of this run so payroll can be generated again."). Empty: "No payroll runs yet".
- `payroll/[runId]/page.tsx` (`use(params)`): header "Payroll – {Month Year}", subtitle "{n} payslips • Total net pay {formatINR}". `Table` of payslips: Code, Name, Present Days, LOP Days, Gross, Deductions, Net Pay, Status, Actions ("View" → `/payslips/{id}`, "Mark Paid" when status GENERATED → `PATCH /api/payroll/payslips/{id}/pay`). A "Back to payroll" link.
- Acceptance criteria: generate for the previous month → 12 payslips; Mark Paid flips the badge to PAID.

### Task 11: Payslips pages
- `payslips/page.tsx`: "My Payslips" `Table` from `GET /api/payslips`: Period, Gross, Deductions, Net Pay, Status, "View". Empty: "No payslips available yet".
- `payslips/[id]/page.tsx` (`use(params)`): fetches `GET /api/payslips/{id}`. Print-friendly layout, max width `max-w-3xl mx-auto`, white card with border:
  1. Header: company name (read from a constant `"CorpERP Pvt. Ltd."` in this file) and "Payslip for {Month Year}".
  2. Employee block (2 columns): Name, Employee Code, Department, Designation.
  3. Attendance block: Working Days in Month (`totalWeekdays`), Days Counted (`countedDays`), Days Present (`presentDays`), Paid Leave Days, Loss of Pay Days.
  4. Two-column table: **Earnings** (Basic, HRA, Allowances, Gross Earnings) and **Deductions** (Provident Fund, Tax, Loss of Pay, Total Deductions).
  5. A highlighted bar "Net Pay: {formatINR}" and the status badge.
  6. Buttons (hidden when printing): "Print / Save as PDF" (`window.print()`), "Back".
- Acceptance criteria: printing from the browser (Ctrl+P) shows only the payslip card, no sidebar/topbar.

### Task 12: Profile page — `src/app/(app)/profile/page.tsx`
- Read-only card: name, email, role badge. Change-password form: current password, new password, confirm new password (client-checks that confirm matches, shows "Passwords do not match"). Submits `POST /api/auth/change-password`. Success toast and clear the form.
- Acceptance criteria: after changing the password, logging out and logging in with the new one works.

---

## Contracts You Must Honor
- Only call endpoints that exist in BUILD.md §6, with exactly those paths, methods, and body shapes.
- Use only the DTO types from `@/lib/types`. Do not redefine them locally.
- Roles and visibility exactly per BUILD.md §5.5 and the per-page rules above.
- Next.js 16: pages with dynamic segments are client components using `use(params)` from React (`params: Promise<{ id: string }>`); `useRouter` from `next/navigation`.

## DO NOT
- Do not add pages, routes, nav items, features, or API calls beyond this file (no dark mode, no notifications, no export buttons, no settings page).
- Do not change the API contract; if an endpoint is missing a field you need, output `// UNCLEAR:` and stop.
- Do not store auth data in `localStorage`/`sessionStorage`.
- Do not display or log passwords or tokens.
- Do not install UI libraries beyond those in BUILD.md §2.
- Do not write your own date/timezone math for business logic (the live "Working days: N" counter in the leave dialog is the only client-side weekday count allowed; it is display-only).
