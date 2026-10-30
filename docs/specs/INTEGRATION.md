# INTEGRATION.md — CorpERP

How the three build files fit together, the order to run them, and how to verify everything works before the demo.

---

## 1. Build Order (strict)

| Step | Agent file | Depends on | Done when |
|---|---|---|---|
| 1 | `BUILD_database.md` | nothing | `npm run setup` works; Prisma Studio shows 10 tables and seeded rows; `npx tsc --noEmit` passes |
| 2 | `BUILD_backend.md` | Step 1 | every check in `scripts/api-check.md` passes |
| 3 | `BUILD_frontend.md` | Step 2 | the demo path in section 4 runs end to end in the browser |
| 4 | QA + polish | Step 3 | section 5 checklist fully ticked |
| 5 | `REPORT_NOTES.md` | Step 3 | report written, screenshots taken |

**Git workflow (solo):** `main` always works. Create branches `feat/database`, `feat/backend`, `feat/frontend`. Commit after every task. Merge each branch into `main` only when its "Done when" is true. Tag `v1-demo` before the presentation.

**How to run an agent:** Open a fresh session per file. Give it `BUILD.md` + that role's file. Tell it: "Build exactly what is specified. Complete the tasks in order and stop at any `// UNCLEAR`." After each task, run its acceptance criteria yourself.

---

## 2. Shared Contracts (single source of truth)

| Contract | Defined in | Written by | Consumed by |
|---|---|---|---|
| Prisma schema | BUILD.md §4 | Database | Backend |
| TypeScript DTOs | BUILD.md §7 → `src/lib/types.ts` | Database | Backend, Frontend |
| Zod validators | BUILD.md §8 → `src/lib/validators.ts` | Backend | Backend, Frontend (forms) |
| API paths, bodies, errors | BUILD.md §6 | Backend | Frontend |
| Business rules (attendance, leave, payroll) | BUILD.md §5 | Backend | Frontend (display only) |
| Date helpers | BUILD_database.md Task 6 → `src/lib/date.ts` | Database | Database (seed), Backend |
| Seed data / demo accounts | BUILD.md §9 | Database | everyone (demo) |

**Rule:** if two files disagree, `BUILD.md` wins. Fix the other file, never the contract, unless you deliberately change `BUILD.md` first and then update all dependents.

---

## 3. Integration Points and Known Risks

| # | Integration point | What can go wrong | How to check |
|---|---|---|---|
| 1 | Prisma `Decimal` → JSON | Decimals serialize as strings and break UI math | Responses must show numbers (`"netPay": 80300`), never strings. Mappers use `Number()`. |
| 2 | Date-only fields | Timezone shifts a day (e.g., `2026-09-01` shows as Aug 31) | `formatDate` parses date-only as UTC. Check join dates and leave dates on screen against Prisma Studio. |
| 3 | IST "today" | Check-in near midnight UTC lands on the wrong date | Always `todayIST()`; never `new Date().toISOString().slice(0,10)`. |
| 4 | Next.js 16 async `params` / `cookies()` | `params.id` is `undefined` or build error | Every dynamic route uses `await params`; every page uses `use(params)`. |
| 5 | Auth cookie in route handlers | Cookie set but not readable on next request | Test login → `/api/auth/me` in browser DevTools → Application → Cookies shows `corperp_token` (HttpOnly). |
| 6 | Role changes / deactivation | Deactivated user keeps working | `getSession()` reloads the user each request; test deactivate then reload. |
| 7 | Payroll vs. attendance mismatch | Payslip numbers differ from the attendance summary | Both call `computeMonthlyAttendance`. Compare the Attendance "Monthly Summary" row with the payslip for the same person and month. |
| 8 | Leave approval and balance | Balance double-counted or not updated | After approving a paid leave, `used` rises by `days` once. Rejecting/cancelling changes nothing. |
| 9 | Prisma client after schema change | `Property does not exist` type errors | Run `npx prisma generate` and restart the dev server. |
| 10 | Seed re-run | Duplicate data / FK errors | Seed is idempotent; if it fails run `npm run db:reset` then `npm run db:seed`. |

---

## 4. Demo Script (this is what you present)

Reset first: `npm run db:reset && npm run db:seed`, then `npm run dev`. All passwords: `Password@123`.

| # | Actor | Action | Expected result |
|---|---|---|---|
| 1 | — | Open `http://localhost:3000` | Redirects to `/login` |
| 2 | Admin (`admin@corperp.com`) | Log in | Dashboard shows employee counts and 3 charts (payroll chart says "No payroll runs yet") |
| 3 | Admin | Departments → add "Legal" | Appears in table |
| 4 | Admin | Employees → Add Employee (e.g., Test User, Engineering, manager Rohan Verma, basic 50000) | Created; opens detail page; code is `EMP013` |
| 5 | Admin | Logout. Log in as `hr@corperp.com` | HR sidebar visible (has Payroll, no delete-run button) |
| 6 | Employee (`employee@corperp.com`) | Log in → Dashboard → Check In, then Check Out | Card shows times and "Worked …", status PRESENT |
| 7 | Employee | Leave → Apply for Leave: Casual Leave, next Mon–Tue | Request appears PENDING; "Working days: 2" shown |
| 8 | Manager (`manager@corperp.com`) | Leave Approvals → approve Sneha's request | Status becomes APPROVED |
| 9 | Employee | Leave page | Request APPROVED; Casual balance dropped by 2 |
| 10 | HR | Payroll → Generate for previous month | Redirects to run page with 12 payslips (13 if you added the test user and he joined before month end) |
| 11 | HR | Attendance → Monthly Summary (previous month) | LOP days match payslips |
| 12 | HR | Open a payslip → Print / Save as PDF | Clean printable payslip |
| 13 | Employee | My Payslips | Sees only their own payslip for that month |
| 14 | Admin | Payroll → Delete run → regenerate | Works (Admin only) |
| 15 | Show Prisma Studio (`npm run db:studio`) | Open `payslips`, `leave_requests`, `attendance` | Real DB rows prove persistence |

Tip: practice the script twice. After each rehearsal run `npm run db:reset && npm run db:seed`.

---

## 5. QA Checklist (tick every box)

### Auth & Roles
- [ ] Wrong password shows an error; correct password logs in
- [ ] Logged-out user visiting `/dashboard` is redirected to `/login`
- [ ] EMPLOYEE cannot open `/employees` (list API returns 403 and the sidebar hides it), `/payroll`, `/leave/approvals`
- [ ] MANAGER sees only direct reports in Employees
- [ ] HR cannot create an ADMIN user (API returns 403, UI hides the option)
- [ ] Deactivated employee cannot log in; reactivated one can

### Attendance
- [ ] Check-in twice → second blocked
- [ ] Check-out before check-in → blocked
- [ ] Check-in/out cycle updates dashboard "Present Today" for HR/Admin
- [ ] Monthly Summary matches the raw records for one person (spot-check)

### Leave
- [ ] Weekend-only range → "Selected range contains no working days"
- [ ] Over-balance request → "Insufficient leave balance"
- [ ] Overlapping request → overlap error
- [ ] Manager cannot approve a non-report's request; nobody can approve their own
- [ ] Approve decreases remaining by `days`; reject/cancel does not

### Payroll
- [ ] Future month blocked; duplicate month blocked
- [ ] Sneha Iyer's payslip for a full month with no absences: gross 90,000, PF 7,200, tax 4,500, LOP 0, net 78,300
- [ ] With absences: LOP deduction = gross ÷ weekdays × LOP days (verify by hand for one person)
- [ ] Mark Paid works once; second try errors
- [ ] Employee can open only their own payslip (try another id in the URL → 403)

### Data & DB
- [ ] Prisma Studio shows all 10 tables with relations
- [ ] Stop and restart the server; data persists
- [ ] `npm run db:reset && npm run db:seed` restores a clean demo state

### Build
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] `npm run start` runs the production build correctly (use this for the final demo — it is faster)

---

## 6. Two-Day Schedule (solo)

**Day 1 — Foundation + Backend**
| Time block | Work |
|---|---|
| Hours 0–1.5 | Database agent: scaffold, Docker, schema, migration |
| Hours 1.5–3 | Database agent: `date.ts`, seed; verify in Prisma Studio |
| Hours 3–5 | Backend agent: `http`, `auth`, `rbac`, `validators`, `mappers`; auth/department/employee routes |
| Hours 5–8 | Backend agent: `leave`, `attendance`, `payroll` libs and routes; dashboard route |
| Hours 8–9 | Run `scripts/api-check.md`; fix bugs; merge to `main` |

**Day 2 — Frontend + QA + Report**
| Time block | Work |
|---|---|
| Hours 0–2 | Frontend: utilities, shell, login, dashboard, check-in card |
| Hours 2–4.5 | Frontend: departments, employees, attendance |
| Hours 4.5–6.5 | Frontend: leave, payroll, payslips, profile |
| Hours 6.5–8 | Full QA checklist; rehearse the demo twice; tag `v1-demo` |
| Hours 8–10 | Report using `REPORT_NOTES.md`; take screenshots |

**If you fall behind, cut in this order:** (1) dashboard charts (keep stat cards), (2) Monthly Summary tab, (3) employee detail Attendance tab, (4) profile page. Never cut payroll, leave approval, or attendance check-in — they are the demo.

---

## 7. Final Pre-Demo Checklist
- [ ] Docker Desktop running; `npm run db:up` done (container `corperp-db` up)
- [ ] `npm run db:reset && npm run db:seed` done right before presenting
- [ ] Use `npm run build && npm run start`, not `dev`
- [ ] `HALF_DAY_THRESHOLD_MINUTES=1` in `.env` so a quick check-in/out counts as PRESENT
- [ ] Browser tabs pre-opened; logged out; screen zoom 100–110%
- [ ] Prisma Studio ready in a separate tab
- [ ] A backup: screen recording of the full demo and a copy of the repo on a pen drive/cloud
