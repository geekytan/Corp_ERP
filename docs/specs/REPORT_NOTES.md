# REPORT_NOTES.md — CorpERP Project Report Material

Ready-to-use content for your written report. Adapt wording to your college's template. Items marked 📸 need a screenshot from the running app.

---

## 1. Suggested Report Structure

1. Title page, certificate, acknowledgement, abstract
2. Introduction (background, problem statement, objectives, scope)
3. Literature / existing systems review
4. Requirement analysis (functional, non-functional, roles)
5. System design (architecture, ER diagram, database design, normalization, API design)
6. Implementation (tech stack, modules, key algorithms)
7. Testing (test cases and results)
8. Results (screenshots)
9. Limitations and future scope
10. Conclusion, references

---

## 2. Abstract (draft)

CorpERP is a web-based Enterprise Resource Planning system for managing the core human-resource operations of a company: employee and department records, daily attendance, leave management with approval workflow, and monthly payroll with payslip generation. The system is built with Next.js, TypeScript, and a PostgreSQL relational database accessed through the Prisma ORM. It supports four roles (Admin, HR, Manager, Employee) with role-based access control. Payroll is computed automatically from attendance and approved leave data, eliminating manual calculation. The project demonstrates relational database design, transactional integrity, secure authentication, and a responsive user interface.

---

## 3. Problem Statement and Objectives

**Problem:** Many small and mid-sized companies track attendance, leave, and salaries in separate spreadsheets. This causes data duplication, calculation errors, no approval trail, and no single source of truth.

**Objectives**
1. Centralize employee, department, attendance, leave, and payroll data in one relational database.
2. Automate monthly payroll from attendance and leave records.
3. Provide a leave request and approval workflow between employees and managers.
4. Enforce role-based access so people only see and do what their role allows.
5. Generate printable payslips for each employee.

**Scope:** Single-company, locally hosted, working week Monday–Friday, no public-holiday calendar, INR currency.

---

## 4. Existing Systems Comparison

| System | Type | Strength | Gap addressed by CorpERP |
|---|---|---|---|
| OrangeHRM | Open-source HRMS | Rich HR features | Heavy PHP stack; too large to study end to end |
| ERPNext / Frappe HR | Open-source ERP | Full ERP incl. payroll | Complex setup; hard to customize quickly |
| Odoo HR | Open-source ERP | Modular | Needs many modules; steep learning curve |
| Excel / manual | Manual | Familiar | Error-prone, no workflow, no access control |

Positioning: CorpERP is a focused, lightweight, fully understood implementation of the HR core (attendance → leave → payroll), suitable for small companies and for learning ERP design.

---

## 5. Requirements

### Functional requirements
| ID | Requirement |
|---|---|
| FR1 | Users log in with email and password; session via secure cookie |
| FR2 | Admin/HR manage departments and employees (create, edit, activate/deactivate) |
| FR3 | Admin/HR define each employee's salary structure |
| FR4 | Every user can check in and check out once per day |
| FR5 | Admin/HR view all attendance and a monthly summary; managers view their team |
| FR6 | Employees apply for leave of a given type; balances are enforced |
| FR7 | Managers (or HR/Admin) approve or reject leave; employees can cancel pending requests |
| FR8 | HR/Admin generate monthly payroll; payslips are stored |
| FR9 | Employees view and print their own payslips |
| FR10 | Role-specific dashboards with statistics and charts |

### Non-functional requirements
Security (hashed passwords, httpOnly JWT cookie, server-side authorization on every API), data integrity (foreign keys, unique constraints, transactions), usability (single-page-like navigation, clear errors), maintainability (typed code, single source of truth for business rules), performance (indexed lookups; 12–hundreds of employees comfortably).

### Actors
Admin, HR, Manager, Employee (see permission matrix in `BUILD.md` §5.5 — include it in the report).

---

## 6. System Architecture

Three layers in one Next.js application:

1. **Presentation layer:** React pages (App Router), Tailwind CSS, shadcn/ui components, Recharts.
2. **Application layer:** REST-style Route Handlers (`/api/...`) with Zod validation, role checks, and business-rule libraries (`attendance`, `leave`, `payroll`).
3. **Data layer:** Prisma ORM → PostgreSQL 16.

Flow: Browser → `fetch /api/...` (JWT cookie) → authentication + RBAC → validation → business logic/transaction → Prisma → PostgreSQL → JSON response.

📸 Draw a block diagram with these three layers (draw.io / Excalidraw).

**Technology justification**
| Choice | Reason |
|---|---|
| Next.js + TypeScript | Full-stack in one codebase; type safety end to end |
| PostgreSQL | ACID transactions, strong relational integrity, industry standard |
| Prisma | Schema-first design, migrations, type-safe queries |
| JWT in httpOnly cookie | Stateless auth, protected from JavaScript access (XSS) |
| Zod | One validation definition shared by client and server |

---

## 7. Database Design

### 7.1 Entities (10 tables)
| Table | Purpose | Key columns |
|---|---|---|
| `departments` | Company departments | id PK, name UNIQUE |
| `employees` | HR master record | id PK, emp_code UNIQUE, department_id FK, manager_id FK (self), join_date, status |
| `users` | Login credentials and role | id PK, email UNIQUE, password_hash, role, employee_id FK UNIQUE |
| `salary_structures` | Salary components per employee | employee_id FK UNIQUE, basic, hra, allowances, pf_percent, tax_percent |
| `attendance` | Daily check-in/out | employee_id FK, date, check_in, check_out, worked_minutes, status; UNIQUE(employee_id, date) |
| `leave_types` | Leave policy | name UNIQUE, annual_quota, is_paid |
| `leave_balances` | Yearly leave entitlement | employee_id FK, leave_type_id FK, year, allocated, used; UNIQUE(employee, type, year) |
| `leave_requests` | Leave applications | employee_id FK, leave_type_id FK, start/end date, days, status, reviewer_id FK |
| `payroll_runs` | One run per month | month, year, created_by FK; UNIQUE(month, year) |
| `payslips` | Salary snapshot per employee per run | payroll_run_id FK (cascade), employee_id FK, all earning/deduction fields; UNIQUE(run, employee) |

### 7.2 Relationships (describe in the ER diagram)
- Department **1 — N** Employee
- Employee **1 — N** Employee (manager → reports, self-referencing)
- Employee **1 — 1** User; Employee **1 — 1** SalaryStructure
- Employee **1 — N** Attendance, LeaveBalance, LeaveRequest (as applicant), Payslip
- Employee **1 — N** LeaveRequest (as reviewer)
- LeaveType **1 — N** LeaveBalance, LeaveRequest
- PayrollRun **1 — N** Payslip; Employee **1 — N** PayrollRun (as creator)

📸 Generate the ER diagram: open Prisma Studio for table views, and paste `prisma/schema.prisma` into https://prismaliser.app (or dbdiagram.io) to export the ERD image.

### 7.3 Normalization
- **1NF:** All columns are atomic (no repeating groups; names split into first/last; a leave request is a single row with start/end dates).
- **2NF:** Every non-key attribute depends on the whole key. Tables with composite uniqueness (`leave_balances`, `attendance`) use a surrogate primary key and every attribute describes the full (employee, type/date, year) combination.
- **3NF:** No transitive dependencies. Department name is stored once in `departments`, not in `employees`. Leave type name and paid flag are stored once in `leave_types`. Credentials are separated from HR data (`users` vs `employees`), and salary components are separated into `salary_structures`.
- **Deliberate denormalization:** `payslips` stores a snapshot of salary figures and day counts. This is intentional: a payslip is a historical financial record that must not change if the salary structure or attendance is edited later. Likewise, `leave_requests.days` is stored to preserve the computed value at application time.

### 7.4 Integrity and constraints (good viva material)
- Foreign keys everywhere; `ON DELETE CASCADE` on child rows owned by an employee (attendance, balances, salary, user) and on payslips of a deleted run.
- Unique constraints prevent double check-in, duplicate payroll for a month, duplicate payslip per employee per run, duplicate balances.
- `Decimal(12,2)` for money (no floating-point errors).
- Transactions: employee creation (4 inserts), leave approval (balance + status), payroll generation (run + all payslips) are atomic.
- Indexes on `employees.department_id`, `employees.manager_id`, `attendance.date`, `leave_requests.status`, `leave_requests.employee_id`, `payslips.employee_id`.

---

## 8. Key Algorithms (include as pseudocode / formulas)

**Leave working-days:** `days = count of Monday–Friday dates in [start, end]`.

**Leave approval (transactional):** verify reviewer permission → verify request is PENDING → if paid type, re-check `allocated − used ≥ days` → `used += days` → set status, reviewer, timestamp.

**Monthly attendance summary:**
```
countedDays   = weekdays from max(month start, join date) to min(month end, today)
presentEq     = present days + 0.5 × half days
paidLeaveDays = weekdays covered by approved paid leave
lopDays       = max(0, countedDays − presentEq − paidLeaveDays)
```

**Payroll:**
```
gross           = basic + HRA + allowances
perDay          = gross / weekdays in month
lopDeduction    = perDay × lopDays
pf              = basic × PF% / 100
tax             = gross × tax% / 100
net             = gross − (pf + tax + lopDeduction)
```
Worked example (Sneha Iyer, basic 60,000, full attendance): HRA 24,000; allowances 6,000; gross 90,000; PF 7,200; tax 4,500; net **78,300**.
Example with 2 LOP days in a month of 22 weekdays: perDay = 4,090.91; LOP = 8,181.82; net = 70,118.18.

---

## 9. Security Measures
- Passwords hashed with bcrypt (cost 10); never returned by any API.
- JWT (HS256) in httpOnly, SameSite=Lax cookie, 8-hour expiry.
- Authorization enforced on the server for every endpoint (UI hiding is cosmetic only).
- Input validated with Zod on the server; Prisma parameterizes queries (protects against SQL injection).
- Deactivated users are rejected on the next request (session re-validated from the database each time).

---

## 10. Test Cases (fill the "Actual" column and screenshot the passes)

| ID | Module | Test | Steps | Expected | Actual | Pass? |
|---|---|---|---|---|---|---|
| T01 | Auth | Valid login | Admin credentials | Redirect to dashboard | Status 200, JWT cookie set, role ADMIN | PASS |
| T02 | Auth | Invalid login | Wrong password | "Invalid email or password" | Status 401, "Invalid email or password" | PASS |
| T03 | Auth | Protected route | Open /dashboard logged out | Redirect to /login | Status 401, "Not authenticated" | PASS |
| T04 | RBAC | Employee blocked | Employee calls GET /api/employees | 403 | Status 403, "You do not have permission to perform this action" | PASS |
| T05 | RBAC | HR cannot create Admin | HR creates user with role ADMIN | 403 | Status 403, "Only an admin can assign or change the admin role" | PASS |
| T06 | Dept | Duplicate name | Add "Finance" again | 409 error toast | Status 409, "Department name already exists" | PASS |
| T07 | Dept | Delete with employees | Delete Engineering | Blocked with message | Status 409, "Cannot delete a department that has employees" | PASS |
| T08 | Employee | Create | Fill form, submit | Employee + login created, code EMP013 | Status 201, created with code EMP013 and login account | PASS |
| T09 | Employee | Duplicate email | Reuse an email | "Email already in use" | Status 409, "Email already in use" | PASS |
| T10 | Employee | Deactivate | Deactivate user, try login | Login rejected | Inactive login blocked (401); Reactivated login allowed (200) | PASS |
| T11 | Attendance | Check-in | Click Check In | Record with time, status PRESENT | Status 201, record created with check-in time, status PRESENT | PASS |
| T12 | Attendance | Double check-in | Call API twice | 409 "Already checked in today" | Status 409, "Already checked in today" | PASS |
| T13 | Attendance | Check-out without check-in | Call API first | 409 | Status 409, "You have not checked in today" | PASS |
| T14 | Leave | Apply valid | Casual Leave next Mon–Tue | PENDING, days = 2 | Status 201, status PENDING, working days = 2 | PASS |
| T15 | Leave | Weekend only | Sat–Sun range | "no working days" error | Status 400, "Selected range contains no working days" | PASS |
| T16 | Leave | Over balance | 20 days Casual | "Insufficient leave balance" | Status 400, "Insufficient leave balance" | PASS |
| T17 | Leave | Overlap | Same dates again | Overlap error | Status 409, "You already have a pending or approved leave overlapping these dates" | PASS |
| T18 | Leave | Approve | Manager approves | APPROVED; balance used +2 | Status 200, status APPROVED, leave balance used incremented by 2 | PASS |
| T19 | Leave | Wrong approver | Manager approves non-report | 403 | Status 403, "You are not allowed to review this request" | PASS |
| T20 | Leave | Cancel pending | Employee cancels | CANCELLED; balance unchanged | Status 200, status CANCELLED, leave balance unchanged | PASS |
| T21 | Payroll | Generate | HR generates previous month | Run + payslips for all active employees | Status 201, PayrollRun created with 13 payslips for active employees | PASS |
| T22 | Payroll | Duplicate run | Generate again | 409 | Status 409, "Payroll already generated for this month" | PASS |
| T23 | Payroll | Future month | Generate next month | 400 | Status 400, "Cannot run payroll for a future month" | PASS |
| T24 | Payroll | Formula check | Compare one payslip with manual calculation | Values match | Values match exact formula: Gross 90k, LOP 14.3k (3.5 days), PF 7.2k, Tax 4.5k, Net 63.9k | PASS |
| T25 | Payroll | Delete run | Admin deletes; HR tries | Admin OK; HR 403 | HR delete returns 403; Admin delete returns 200 | PASS |
| T26 | Payslip | Access control | Employee opens another's payslip URL | 403 | Own payslip returns 200; other employee's payslip returns 403 | PASS |
| T27 | Dashboard | Role views | Log in as each role | Correct view and numbers | All 4 roles receive role-specific metrics, counts, balances, and charts | PASS |
| T28 | Persistence | Restart | Stop/start server | Data still present | All entities and relational queries persist in PostgreSQL | PASS |

---

## 11. Screenshot Checklist 📸
Login • Admin dashboard (charts) • Department list • Employee list • Add employee form • Employee detail (salary tab) • Attendance check-in card • Attendance records table • Monthly summary • Leave page with balances • Apply leave dialog • Leave approvals • Payroll runs page • Payroll run detail • Printed payslip • Employee dashboard • Manager dashboard • Prisma Studio (3 tables) • ER diagram • Terminal showing `npm run build` success

---

## 12. Limitations and Future Scope
**Limitations:** single company; fixed Mon–Fri week; no public-holiday calendar; no email notifications; no biometric/geo-fenced attendance; simplified tax (flat percentage); no password reset by email; runs locally only.

**Future scope:** holiday calendar and shift management; statutory compliance (slab-based income tax, PF/ESI rules); email/SMS notifications; biometric or QR-based attendance; recruitment and performance modules; export to PDF/Excel; multi-tenant cloud deployment; audit logs.

---

## 13. Viva Preparation (likely questions)
1. **Why PostgreSQL over MongoDB?** HR/payroll data is highly relational and needs ACID transactions and constraints.
2. **Why store payslip values instead of recomputing?** Historical records must be immutable (denormalization by design).
3. **How do you prevent double check-in / duplicate payroll?** Unique constraints at the database level plus checks in the API.
4. **How is salary calculated?** Explain section 8 and walk through one payslip.
5. **How does authentication work?** bcrypt hash compare → JWT signed with a secret → httpOnly cookie → verified and user reloaded on every request.
6. **What happens if two HR users approve the same leave simultaneously?** Status check and balance update run in a transaction; the second sees a non-pending status and gets 409.
7. **What is a foreign key / cascade here?** Show employees → attendance cascade.
8. **How would you scale this?** Indexes, pagination (already used), caching, move to managed Postgres, background jobs for payroll.
9. **What is the role of Prisma migrations?** Versioned, reproducible schema changes (`prisma/migrations`).
10. **How do you handle time zones?** Fixed company timezone (IST); date-only values stored as `DATE`, timestamps in UTC.
