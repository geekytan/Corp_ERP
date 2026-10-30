# CorpERP

## Overview
CorpERP is a corporate ERP web application designed for a single company to manage human resources.
It provides complete modules for employee directories, daily self-attendance tracking, leave workflows, and monthly payroll processing.
The system features role-based access control across four distinct user roles: Admin, HR, Manager, and Employee.

## Prerequisites
- Node.js 22 LTS
- Docker Desktop OR local PostgreSQL 16

## Setup
1. Clone the repository and navigate into the project directory:
   ```bash
   cd corperp
   ```
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```
4. Start the database container (if using Docker):
   ```bash
   npm run db:up
   ```
5. Initialize schema migrations and seed the database:
   ```bash
   npm run setup
   ```
6. Start the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Local PostgreSQL without Docker
If running PostgreSQL locally without Docker, connect to your PostgreSQL instance using `psql` or pgAdmin as a superuser and run:
```sql
CREATE USER corperp WITH PASSWORD 'corperp';
CREATE DATABASE corperp OWNER corperp;
ALTER USER corperp CREATEDB;
```

## Demo Accounts
All seeded accounts use the default password: `Password@123`.

| Role | Email | Name | Department | Designation |
|---|---|---|---|---|
| ADMIN | `admin@corperp.com` | Aarav Mehta | Operations | System Administrator |
| HR | `hr@corperp.com` | Priya Sharma | Human Resources | HR Manager |
| MANAGER | `manager@corperp.com` | Rohan Verma | Engineering | Engineering Manager |
| EMPLOYEE | `employee@corperp.com` | Sneha Iyer | Engineering | Software Engineer |

## Useful Commands
The project defines the following npm scripts:

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Build the Next.js production bundle |
| `npm run start` | Start the production server |
| `npm run db:up` | Start the PostgreSQL container via Docker Compose |
| `npm run db:migrate` | Run pending Prisma schema migrations |
| `npm run db:seed` | Seed the database with demo data |
| `npm run db:reset` | Reset the database and re-apply all migrations |
| `npm run db:studio` | Launch Prisma Studio GUI at http://localhost:5555 |
| `npm run setup` | Generate Prisma client, apply migrations, and seed data |

## Reset Data
To reset the database back to its clean initial demo state at any time, run:
```bash
npm run db:reset && npm run db:seed
```

## Documentation & DBMS Project Report
Comprehensive academic documentation and project specifications are available in the [`docs/`](docs/) directory:
- **DBMS Project Report**: [`docs/CorpERP_DBMS_Project_Report.docx`](docs/CorpERP_DBMS_Project_Report.docx)
- **Architecture & ER Figures**: [`docs/figures/`](docs/figures/)
  - `image4.png`: Three-Tier System Architecture
  - `image5.png`: Normalized Entity-Relationship (ER) Diagram
  - `image6.png`: Data Flow Diagram Level 0 (Context Diagram)
  - `image7.png`: Data Flow Diagram Level 1 (Functional Decomposition)
  - `image8.png` – `image12.png`: Production UI Interfaces & Clean Printable Salary Slip
- **Specifications & Testing Guides**: [`docs/specs/`](docs/specs/)
  - `BUILD.md`: Master specification, business rules, and API contracts
  - `INTEGRATION.md`: Integration plan, 15-step live demo script, and QA checklist
  - `REPORT_NOTES.md`: Worked payroll algorithms, 28 QA test cases, and viva Q&A

