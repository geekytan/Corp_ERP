import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  todayIST,
  currentYearIST,
  toDateOnly,
  addDays,
  isWeekday,
  eachWeekday,
  weekdaysBetween,
  monthBounds,
  istToUtc,
} from "../src/lib/date";

const db = new PrismaClient();

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEPARTMENTS = [
  "Engineering",
  "Human Resources",
  "Finance",
  "Sales",
  "Operations",
];

const LEAVE_TYPES = [
  { name: "Casual Leave", annualQuota: 12, isPaid: true },
  { name: "Sick Leave", annualQuota: 10, isPaid: true },
  { name: "Earned Leave", annualQuota: 15, isPaid: true },
  { name: "Leave Without Pay", annualQuota: 0, isPaid: false },
];

interface EmployeeSeedData {
  empCode: string;
  name: string;
  email: string;
  role: "ADMIN" | "HR" | "MANAGER" | "EMPLOYEE";
  dept: string;
  designation: string;
  managerCode: string | null;
  basic: number;
}

const EMPLOYEES: EmployeeSeedData[] = [
  { empCode: "EMP001", name: "Aarav Mehta", email: "admin@corperp.com", role: "ADMIN", dept: "Operations", designation: "System Administrator", managerCode: null, basic: 90000 },
  { empCode: "EMP002", name: "Priya Sharma", email: "hr@corperp.com", role: "HR", dept: "Human Resources", designation: "HR Manager", managerCode: "EMP001", basic: 70000 },
  { empCode: "EMP003", name: "Rohan Verma", email: "manager@corperp.com", role: "MANAGER", dept: "Engineering", designation: "Engineering Manager", managerCode: "EMP001", basic: 110000 },
  { empCode: "EMP004", name: "Sneha Iyer", email: "employee@corperp.com", role: "EMPLOYEE", dept: "Engineering", designation: "Software Engineer", managerCode: "EMP003", basic: 60000 },
  { empCode: "EMP005", name: "Kabir Khan", email: "kabir@corperp.com", role: "EMPLOYEE", dept: "Engineering", designation: "Backend Developer", managerCode: "EMP003", basic: 65000 },
  { empCode: "EMP006", name: "Ananya Rao", email: "ananya@corperp.com", role: "EMPLOYEE", dept: "Engineering", designation: "QA Engineer", managerCode: "EMP003", basic: 45000 },
  { empCode: "EMP007", name: "Kavita Nair", email: "kavita@corperp.com", role: "MANAGER", dept: "Sales", designation: "Sales Manager", managerCode: "EMP001", basic: 85000 },
  { empCode: "EMP008", name: "Arjun Patel", email: "arjun@corperp.com", role: "EMPLOYEE", dept: "Sales", designation: "Sales Executive", managerCode: "EMP007", basic: 40000 },
  { empCode: "EMP009", name: "Meera Joshi", email: "meera@corperp.com", role: "EMPLOYEE", dept: "Sales", designation: "Account Executive", managerCode: "EMP007", basic: 42000 },
  { empCode: "EMP010", name: "Vikram Singh", email: "vikram@corperp.com", role: "MANAGER", dept: "Finance", designation: "Finance Manager", managerCode: "EMP001", basic: 80000 },
  { empCode: "EMP011", name: "Divya Menon", email: "divya@corperp.com", role: "EMPLOYEE", dept: "Finance", designation: "Accountant", managerCode: "EMP010", basic: 48000 },
  { empCode: "EMP012", name: "Rahul Desai", email: "rahul@corperp.com", role: "EMPLOYEE", dept: "Operations", designation: "Operations Executive", managerCode: "EMP001", basic: 38000 },
];

async function main() {
  console.log("Seeding CorpERP database...");

  // 1. Delete rows in order (children first)
  await db.payslip.deleteMany();
  await db.payrollRun.deleteMany();
  await db.leaveRequest.deleteMany();
  await db.leaveBalance.deleteMany();
  await db.attendance.deleteMany();
  await db.salaryStructure.deleteMany();
  await db.user.deleteMany();
  await db.employee.deleteMany();
  await db.leaveType.deleteMany();
  await db.department.deleteMany();

  // 2. Departments
  const deptMap = new Map<string, string>();
  for (const name of DEPARTMENTS) {
    const dept = await db.department.create({ data: { name } });
    deptMap.set(name, dept.id);
  }

  // 3. Leave types
  const leaveTypeMap = new Map<string, { id: string; annualQuota: number; isPaid: boolean }>();
  for (const lt of LEAVE_TYPES) {
    const created = await db.leaveType.create({ data: lt });
    leaveTypeMap.set(lt.name, created);
  }

  // 4. Employees + Users + SalaryStructures (Pass 1: without managerId)
  const passwordHash = bcrypt.hashSync("Password@123", 10);
  const empMap = new Map<string, { id: string; empCode: string }>();

  for (const item of EMPLOYEES) {
    const [firstName, ...rest] = item.name.split(" ");
    const lastName = rest.join(" ");
    const deptId = deptMap.get(item.dept)!;

    const emp = await db.employee.create({
      data: {
        empCode: item.empCode,
        firstName,
        lastName,
        designation: item.designation,
        joinDate: toDateOnly("2025-01-06"),
        status: "ACTIVE",
        departmentId: deptId,
      },
    });
    empMap.set(item.empCode, emp);

    // User
    await db.user.create({
      data: {
        email: item.email,
        passwordHash,
        role: item.role,
        isActive: true,
        employeeId: emp.id,
      },
    });

    // Salary Structure
    const basic = item.basic;
    const hra = basic * 0.40;
    const allowances = basic * 0.10;
    await db.salaryStructure.create({
      data: {
        employeeId: emp.id,
        basic,
        hra,
        allowances,
        pfPercent: 12,
        taxPercent: 5,
      },
    });
  }

  // Pass 2: update managerId
  for (const item of EMPLOYEES) {
    if (item.managerCode) {
      const emp = empMap.get(item.empCode)!;
      const mgr = empMap.get(item.managerCode)!;
      await db.employee.update({
        where: { id: emp.id },
        data: { managerId: mgr.id },
      });
    }
  }

  // 5. Leave balances for currentYearIST()
  const currentYear = currentYearIST();
  for (const item of EMPLOYEES) {
    const emp = empMap.get(item.empCode)!;
    for (const lt of LEAVE_TYPES) {
      if (lt.isPaid) {
        const ltObj = leaveTypeMap.get(lt.name)!;
        await db.leaveBalance.create({
          data: {
            employeeId: emp.id,
            leaveTypeId: ltObj.id,
            year: currentYear,
            allocated: ltObj.annualQuota,
            used: 0,
          },
        });
      }
    }
  }

  // 6. Leave Requests (3 per §9)
  const today = todayIST();
  const currentMonthNum = parseInt(today.slice(5, 7), 10);
  const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
  const prevMonthYear = currentMonthNum === 1 ? currentYear - 1 : currentYear;

  const casualLt = leaveTypeMap.get("Casual Leave")!;
  const sickLt = leaveTypeMap.get("Sick Leave")!;

  // 1) Ananya Rao (EMP006) - Casual Leave, 2 weekdays in previous month (8th & 9th if weekdays, else next two)
  let ananyaStart = `${prevMonthYear.toString().padStart(4, "0")}-${prevMonthNum.toString().padStart(2, "0")}-08`;
  while (!isWeekday(ananyaStart)) {
    ananyaStart = addDays(ananyaStart, 1);
  }
  let ananyaEnd = addDays(ananyaStart, 1);
  while (!isWeekday(ananyaEnd)) {
    ananyaEnd = addDays(ananyaEnd, 1);
  }
  const ananyaDays = weekdaysBetween(ananyaStart, ananyaEnd);

  const ananyaEmp = empMap.get("EMP006")!;
  const rohanEmp = empMap.get("EMP003")!;

  await db.leaveRequest.create({
    data: {
      employeeId: ananyaEmp.id,
      leaveTypeId: casualLt.id,
      startDate: toDateOnly(ananyaStart),
      endDate: toDateOnly(ananyaEnd),
      days: ananyaDays,
      reason: "Family function",
      status: "APPROVED",
      reviewerId: rohanEmp.id,
      reviewedAt: new Date(),
    },
  });

  // Increment used by 2 on Ananya's Casual Leave balance for year of leave's start date
  const ananyaLeaveYear = parseInt(ananyaStart.slice(0, 4), 10);
  const ananyaBal = await db.leaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_year: {
        employeeId: ananyaEmp.id,
        leaveTypeId: casualLt.id,
        year: ananyaLeaveYear,
      },
    },
  });

  if (ananyaBal) {
    await db.leaveBalance.update({
      where: { id: ananyaBal.id },
      data: { used: ananyaBal.used + 2 },
    });
  } else {
    await db.leaveBalance.create({
      data: {
        employeeId: ananyaEmp.id,
        leaveTypeId: casualLt.id,
        year: ananyaLeaveYear,
        allocated: casualLt.annualQuota,
        used: 2,
      },
    });
  }

  // 2) Kabir Khan (EMP005) - Sick Leave, next 2 weekdays after today, reason "Medical appointment", PENDING
  let kabirStart = addDays(today, 1);
  while (!isWeekday(kabirStart)) {
    kabirStart = addDays(kabirStart, 1);
  }
  let kabirEnd = addDays(kabirStart, 1);
  while (!isWeekday(kabirEnd)) {
    kabirEnd = addDays(kabirEnd, 1);
  }
  const kabirDays = weekdaysBetween(kabirStart, kabirEnd);
  const kabirEmp = empMap.get("EMP005")!;

  await db.leaveRequest.create({
    data: {
      employeeId: kabirEmp.id,
      leaveTypeId: sickLt.id,
      startDate: toDateOnly(kabirStart),
      endDate: toDateOnly(kabirEnd),
      days: kabirDays,
      reason: "Medical appointment",
      status: "PENDING",
    },
  });

  // 3) Arjun Patel (EMP008) - Casual Leave, 1 weekday in previous month (20th or next weekday), REJECTED by Kavita Nair
  let arjunDate = `${prevMonthYear.toString().padStart(4, "0")}-${prevMonthNum.toString().padStart(2, "0")}-20`;
  while (!isWeekday(arjunDate)) {
    arjunDate = addDays(arjunDate, 1);
  }
  const arjunEmp = empMap.get("EMP008")!;
  const kavitaEmp = empMap.get("EMP007")!;

  await db.leaveRequest.create({
    data: {
      employeeId: arjunEmp.id,
      leaveTypeId: casualLt.id,
      startDate: toDateOnly(arjunDate),
      endDate: toDateOnly(arjunDate),
      days: 1,
      reason: "Personal work",
      status: "REJECTED",
      reviewerId: kavitaEmp.id,
      reviewComment: "Quarter-end targets",
      reviewedAt: new Date(),
    },
  });

  // 7. Attendance seed
  // Entire previous calendar month + current month up to yesterday (IST), weekdays only.
  // Skip dates covered by seeded APPROVED leave (Ananya's leave dates).
  const prevMonthBounds = monthBounds(prevMonthYear, prevMonthNum);
  const yesterday = addDays(today, -1);

  const attendanceRecords: {
    employeeId: string;
    date: Date;
    checkIn: Date;
    checkOut: Date;
    workedMinutes: number;
    status: "PRESENT" | "HALF_DAY";
  }[] = [];

  const weekdays = eachWeekday(prevMonthBounds.start, yesterday);

  EMPLOYEES.forEach((item, idx) => {
    const employeeIndex = idx + 1; // 1-based index per §9
    const emp = empMap.get(item.empCode)!;

    for (const dateStr of weekdays) {
      // Skip if covered by seeded APPROVED leave
      if (item.empCode === "EMP006" && dateStr >= ananyaStart && dateStr <= ananyaEnd) {
        continue;
      }

      const dayOfMonth = parseInt(dateStr.slice(8, 10), 10);
      const seed = employeeIndex * 1000 + dayOfMonth;
      const rng = mulberry32(seed);
      const r = rng();

      if (r < 0.88) {
        // PRESENT
        attendanceRecords.push({
          employeeId: emp.id,
          date: toDateOnly(dateStr),
          checkIn: istToUtc(dateStr, "09:00"),
          checkOut: istToUtc(dateStr, "18:00"),
          workedMinutes: 540,
          status: "PRESENT",
        });
      } else if (r < 0.93) {
        // HALF_DAY
        attendanceRecords.push({
          employeeId: emp.id,
          date: toDateOnly(dateStr),
          checkIn: istToUtc(dateStr, "09:00"),
          checkOut: istToUtc(dateStr, "13:30"),
          workedMinutes: 270,
          status: "HALF_DAY",
        });
      }
      // Otherwise no row (absent)
    }
  });

  if (attendanceRecords.length > 0) {
    await db.attendance.createMany({
      data: attendanceRecords,
      skipDuplicates: true,
    });
  }

  // 8. Print Summary
  const [
    deptCount,
    empCount,
    userCount,
    salaryCount,
    attendanceCount,
    leaveTypeCount,
    leaveBalanceCount,
    leaveRequestCount,
    payrollRunCount,
    payslipCount,
  ] = await Promise.all([
    db.department.count(),
    db.employee.count(),
    db.user.count(),
    db.salaryStructure.count(),
    db.attendance.count(),
    db.leaveType.count(),
    db.leaveBalance.count(),
    db.leaveRequest.count(),
    db.payrollRun.count(),
    db.payslip.count(),
  ]);

  console.log("\n=================================");
  console.log("CorpERP Database Seed Completed!");
  console.log("=================================");
  console.log(`Departments:       ${deptCount}`);
  console.log(`Employees:         ${empCount}`);
  console.log(`Users:             ${userCount}`);
  console.log(`Salary Structures: ${salaryCount}`);
  console.log(`Leave Types:       ${leaveTypeCount}`);
  console.log(`Leave Balances:    ${leaveBalanceCount}`);
  console.log(`Leave Requests:    ${leaveRequestCount}`);
  console.log(`Attendance Rows:   ${attendanceCount}`);
  console.log(`Payroll Runs:      ${payrollRunCount}`);
  console.log(`Payslips:          ${payslipCount}`);
  console.log("=================================");
  console.log("Demo Accounts (all passwords: Password@123):");
  console.log("  ADMIN:    admin@corperp.com");
  console.log("  HR:       hr@corperp.com");
  console.log("  MANAGER:  manager@corperp.com");
  console.log("  EMPLOYEE: employee@corperp.com");
  console.log("=================================\n");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
