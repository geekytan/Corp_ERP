# BUILD_database.md — Foundation + Database Agent

> ⚠️ AGENT INSTRUCTIONS: You are building ONLY the items in this file. Nothing else. Build exactly as specified. Read `BUILD.md` fully first. If anything is unclear, output `// UNCLEAR: [question]` and stop.

Run this agent FIRST. Nothing else can start until all tasks here pass their acceptance criteria.

---

## Your Scope

1. Project scaffolding (Next.js 16 + Tailwind v4 + TypeScript + shadcn init + all packages)
2. PostgreSQL via Docker Compose
3. Prisma schema, first migration, seed script
4. Foundation libs: `env.ts`, `db.ts`, `date.ts`, `types.ts`
5. `.env.example`, `.gitignore`, `README.md`

## Your Files

| File | Purpose |
|---|---|
| `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `components.json` | Scaffold + config |
| `.env.example`, `.env`, `.gitignore` | Environment |
| `docker-compose.yml` | Local Postgres 16 |
| `prisma/schema.prisma` | Verbatim from BUILD.md §4 |
| `prisma/seed.ts` | Seed per BUILD.md §9 |
| `src/lib/env.ts` | Typed env |
| `src/lib/db.ts` | Prisma singleton |
| `src/lib/date.ts` | All date helpers |
| `src/lib/types.ts` | Verbatim from BUILD.md §7 |
| `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx` | Minimal shell only (see Task 1) |
| `README.md` | Setup + demo accounts |

---

## Your Tasks (ordered)

### Task 1: Scaffold the project
- What to build: In an empty folder named `corperp`, run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`. Then install:
  - dependencies: `@prisma/client@^6 jose bcryptjs zod@^3.25 recharts lucide-react date-fns sonner`
  - devDependencies: `prisma@^6 tsx`
  - Run `npx shadcn@latest init` (style: default, base color: neutral, CSS variables: yes), then `npx shadcn@latest add button input label card table dialog select badge tabs sonner textarea separator skeleton dropdown-menu`.
  - Set the npm scripts and the `prisma.seed` key exactly as in BUILD.md §11.
  - Set `src/app/layout.tsx` to render `<html lang="en"><body>{children}<Toaster /></body></html>` with metadata title `CorpERP`, importing `Toaster` from `@/components/ui/sonner`.
  - Set `src/app/page.tsx` to `redirect("/dashboard")` from `next/navigation`.
- File(s): files listed above.
- Inputs: none.
- Outputs: a project where `npm run dev` starts without errors.
- Acceptance criteria: `npm run dev` serves on `http://localhost:3000`; `npm run build` type-checks (page `/dashboard` may 404 at this point, that is fine); no package outside BUILD.md §2 is in `package.json` (shadcn's own radix packages and `class-variance-authority`, `clsx`, `tailwind-merge` are allowed).

### Task 2: Environment files
- What to build:
  - `.env.example` with the 5 variables from BUILD.md §3 and the example values given there (`AUTH_SECRET=change-me-to-a-random-string-of-at-least-32-chars`).
  - `.env` copied from `.env.example`, with `AUTH_SECRET` replaced by a random 48-character string.
  - `.gitignore` must include `node_modules`, `.next`, `.env`, `*.log`.
  - `src/lib/env.ts`: exports `env = { DATABASE_URL, AUTH_SECRET, HALF_DAY_THRESHOLD_MINUTES: number, DEFAULT_EMPLOYEE_PASSWORD, COMPANY_NAME }`. Throws `Error("Missing env var: NAME")` if `DATABASE_URL` or `AUTH_SECRET` is missing, and `Error("AUTH_SECRET must be at least 32 characters")` if too short. Defaults when unset: `HALF_DAY_THRESHOLD_MINUTES=240`, `DEFAULT_EMPLOYEE_PASSWORD="Welcome@123"`, `COMPANY_NAME="CorpERP Pvt. Ltd."`.
- File(s): `.env.example`, `.env`, `.gitignore`, `src/lib/env.ts`
- Acceptance criteria: importing `env` with a valid `.env` works; removing `AUTH_SECRET` makes the import throw the exact message.

### Task 3: PostgreSQL via Docker
- What to build: `docker-compose.yml` with one service `db`: image `postgres:16`, container_name `corperp-db`, env `POSTGRES_USER=corperp`, `POSTGRES_PASSWORD=corperp`, `POSTGRES_DB=corperp`, port `5432:5432`, named volume `corperp_pgdata:/var/lib/postgresql/data`, `restart: unless-stopped`.
- File(s): `docker-compose.yml`
- Acceptance criteria: `npm run db:up` starts the container; `docker exec corperp-db psql -U corperp -d corperp -c "select 1"` returns 1.
- Note: if the user installed Postgres locally instead of Docker, the same credentials/database name must be created manually (documented in README Task 8).

### Task 4: Prisma schema + migration
- What to build: Copy BUILD.md §4 into `prisma/schema.prisma` VERBATIM. Run `npx prisma migrate dev --name init`. Create `src/lib/db.ts`:
  ```ts
  import { PrismaClient } from "@prisma/client";
  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
  export const db = globalForPrisma.prisma ?? new PrismaClient();
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
  ```
- File(s): `prisma/schema.prisma`, `prisma/migrations/*`, `src/lib/db.ts`
- Acceptance criteria: migration applies; `npx prisma studio` shows these 10 tables: `departments, employees, users, salary_structures, attendance, leave_types, leave_balances, leave_requests, payroll_runs, payslips`.

### Task 5: Shared types
- What to build: Copy BUILD.md §7 VERBATIM into `src/lib/types.ts`.
- File(s): `src/lib/types.ts`
- Acceptance criteria: `npx tsc --noEmit` passes.

### Task 6: Date helpers
- What to build: `src/lib/date.ts` exporting EXACTLY these functions (pure, no external deps, use only `Date` and `Intl`). A "date string" means `"YYYY-MM-DD"`.
  | Function | Behavior |
  |---|---|
  | `todayIST(): string` | Today's date in `Asia/Kolkata`, via `new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date())` |
  | `currentYearIST(): number` | Year part of `todayIST()` |
  | `toDateOnly(s: string): Date` | `new Date(s + "T00:00:00.000Z")` |
  | `fromDateOnly(d: Date): string` | `d.toISOString().slice(0, 10)` |
  | `addDays(s: string, n: number): string` | Adds n days using UTC arithmetic |
  | `isWeekday(s: string): boolean` | True if UTC day-of-week of `toDateOnly(s)` is 1–5 |
  | `eachDay(start: string, end: string): string[]` | Inclusive list; empty array if `start > end` |
  | `eachWeekday(start: string, end: string): string[]` | `eachDay` filtered by `isWeekday` |
  | `weekdaysBetween(start: string, end: string): number` | `eachWeekday(...).length` |
  | `monthBounds(year: number, month: number): { start: string; end: string }` | First and last day of the month (month is 1–12) |
  | `maxDate(a: string, b: string): string` and `minDate(a: string, b: string): string` | String comparison (valid for YYYY-MM-DD) |
  | `isValidDateString(s: string): boolean` | Matches regex and round-trips (`fromDateOnly(toDateOnly(s)) === s`) |
  | `istToUtc(dateStr: string, hhmm: string): Date` | `new Date(`${dateStr}T${hhmm}:00+05:30`)` |
  | `monthLabel(month: number, year: number): string` | `"Sep 2026"` style using English short month names from a hard-coded array |
- File(s): `src/lib/date.ts`
- Acceptance criteria: with a quick `tsx` check — `weekdaysBetween("2026-09-01","2026-09-30") === 22`; `monthBounds(2026,2)` returns `{start:"2026-02-01",end:"2026-02-28"}`; `isWeekday("2026-10-31") === false` (Saturday); `istToUtc("2026-09-01","09:00").toISOString() === "2026-09-01T03:30:00.000Z"`.

### Task 7: Seed script
- What to build: `prisma/seed.ts`, run by `npm run db:seed`. It must be **idempotent**: it first deletes all rows in this order (children first): `payslips, payroll_runs, leave_requests, leave_balances, attendance, salary_structures, users, employees, leave_types, departments`, then recreates everything. Implement exactly BUILD.md §9:
  1. Departments (5).
  2. Leave types (4).
  3. Employees in the table order, in two passes: create all employees without `managerId`, then update `managerId` by `empCode` mapping. Each employee gets: `User` (email, `bcryptjs.hashSync("Password@123", 10)`, role), `SalaryStructure` (basic, `hra = basic*0.40`, `allowances = basic*0.10`, 12, 5).
  4. Leave balances: for each employee and each paid leave type for `currentYearIST()`: `allocated = annualQuota`, `used = 0`. (Implement inline; the backend `ensureLeaveBalances` helper does not exist yet.)
  5. Leave requests (3) per §9, including `days` computed with `weekdaysBetween`, and incrementing `used` by 2 on Ananya's Casual Leave balance for the **year of that leave's start date** (if the previous month falls in the previous year, use balance row for that year, creating it if missing).
  6. Attendance per §9 using `mulberry32` (implement inline):
     ```ts
     function mulberry32(a: number) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
     ```
     Date range: from first day of previous calendar month to yesterday (`addDays(todayIST(), -1)`), weekdays only, skipping dates covered by the seeded APPROVED leave of that employee. Use `createMany` with `skipDuplicates`. `checkIn/checkOut` use `istToUtc`. `employeeIndex` = position in the §9 table starting at 1.
  7. Print a final summary with `console.log` (allowed in seed): counts of each table and the demo credentials.
- File(s): `prisma/seed.ts`
- Acceptance criteria: `npm run db:seed` finishes in under 30 seconds; running it twice gives identical row counts (employees 12, users 12, departments 5, leave_types 4, leave_requests 3, payslips 0, payroll_runs 0); no attendance row exists for today's IST date; attendance rows exist for the previous full month; `select count(*) from users` = 12.

### Task 8: README
- What to build: `README.md` with these exact sections: Overview (3 lines), Prerequisites (Node 22, Docker Desktop OR local PostgreSQL 16), Setup (numbered: `npm install`, copy `.env.example` to `.env`, `npm run db:up`, `npm run setup`, `npm run dev`), Local PostgreSQL without Docker (the 3 SQL commands: `CREATE USER corperp WITH PASSWORD 'corperp';`, `CREATE DATABASE corperp OWNER corperp;`, `ALTER USER corperp CREATEDB;`), Demo accounts (table of the 4 role accounts with password `Password@123`), Useful commands (the npm scripts), Reset data (`npm run db:reset && npm run db:seed`).
- File(s): `README.md`
- Acceptance criteria: a fresh clone can follow it start to finish and reach the (empty) app on localhost:3000.

---

## Contracts You Must Honor
- BUILD.md §4 schema (verbatim), §7 types (verbatim), §9 seed data (exact), §3 env vars, §11 scripts.
- `src/lib/db.ts` must export a named export `db`. `src/lib/env.ts` must export a named export `env`. `src/lib/date.ts` must export exactly the functions listed in Task 6 with those exact names and signatures.

## DO NOT
- Do not build anything outside your scope list (no API routes, no pages beyond the minimal shell, no auth code).
- Do not modify the schema, even to "fix" something. If you believe it is wrong, output `// UNCLEAR:` and stop.
- Do not add extra seed data (no extra employees, no payroll runs, no attendance for today).
- Do not use Prisma 7 or install `@prisma/adapter-*`.
- Do not add packages without updating the master BUILD.md first.
