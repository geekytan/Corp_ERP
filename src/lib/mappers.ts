import { Prisma } from "@prisma/client";
import { fromDateOnly } from "@/lib/date";
import {
  AttendanceRecordDto,
  EmployeeDetail,
  EmployeeListItem,
  LeaveRequestDto,
  PayrollRunDto,
  PayslipDto,
  SalaryDto,
} from "@/lib/types";

export function num(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return Number(d);
}

export const employeeInclude = {
  department: true,
  manager: true,
  user: true,
  salary: true,
} as const;

export type EmployeeWithRelations = Prisma.EmployeeGetPayload<{
  include: typeof employeeInclude;
}>;

export function toSalaryDto(
  salary: Prisma.SalaryStructureGetPayload<object> | null
): SalaryDto | null {
  if (!salary) return null;
  return {
    basic: num(salary.basic),
    hra: num(salary.hra),
    allowances: num(salary.allowances),
    pfPercent: num(salary.pfPercent),
    taxPercent: num(salary.taxPercent),
  };
}

export function toEmployeeListItem(emp: EmployeeWithRelations): EmployeeListItem {
  return {
    id: emp.id,
    empCode: emp.empCode,
    name: `${emp.firstName} ${emp.lastName}`,
    email: emp.user?.email ?? "",
    designation: emp.designation,
    departmentId: emp.departmentId,
    departmentName: emp.department.name,
    managerName: emp.manager
      ? `${emp.manager.firstName} ${emp.manager.lastName}`
      : null,
    status: emp.status,
    role: emp.user?.role ?? "EMPLOYEE",
    joinDate: fromDateOnly(emp.joinDate),
  };
}

export function toEmployeeDetail(
  emp: EmployeeWithRelations,
  includeSalary = true
): EmployeeDetail {
  return {
    ...toEmployeeListItem(emp),
    firstName: emp.firstName,
    lastName: emp.lastName,
    phone: emp.phone,
    managerId: emp.managerId,
    salary: includeSalary ? toSalaryDto(emp.salary) : null,
  };
}

export const attendanceInclude = {
  employee: true,
} as const;

export type AttendanceWithRelations = Prisma.AttendanceGetPayload<{
  include: typeof attendanceInclude;
}>;

export function toAttendanceDto(
  att: AttendanceWithRelations
): AttendanceRecordDto {
  return {
    id: att.id,
    employeeId: att.employeeId,
    employeeName: `${att.employee.firstName} ${att.employee.lastName}`,
    empCode: att.employee.empCode,
    date: fromDateOnly(att.date),
    checkIn: att.checkIn.toISOString(),
    checkOut: att.checkOut ? att.checkOut.toISOString() : null,
    workedMinutes: att.workedMinutes,
    status: att.status,
  };
}

export const leaveRequestInclude = {
  employee: true,
  leaveType: true,
  reviewer: true,
} as const;

export type LeaveRequestWithRelations = Prisma.LeaveRequestGetPayload<{
  include: typeof leaveRequestInclude;
}>;

export function toLeaveRequestDto(
  req: LeaveRequestWithRelations
): LeaveRequestDto {
  return {
    id: req.id,
    employeeId: req.employeeId,
    employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
    empCode: req.employee.empCode,
    leaveTypeId: req.leaveTypeId,
    leaveTypeName: req.leaveType.name,
    startDate: fromDateOnly(req.startDate),
    endDate: fromDateOnly(req.endDate),
    days: req.days,
    reason: req.reason,
    status: req.status,
    reviewerName: req.reviewer
      ? `${req.reviewer.firstName} ${req.reviewer.lastName}`
      : null,
    reviewComment: req.reviewComment,
    createdAt: req.createdAt.toISOString(),
    reviewedAt: req.reviewedAt ? req.reviewedAt.toISOString() : null,
  };
}

export const payslipInclude = {
  employee: {
    include: {
      department: true,
    },
  },
} as const;

export type PayslipWithRelations = Prisma.PayslipGetPayload<{
  include: typeof payslipInclude;
}>;

export function toPayslipDto(ps: PayslipWithRelations): PayslipDto {
  return {
    id: ps.id,
    payrollRunId: ps.payrollRunId,
    employeeId: ps.employeeId,
    employeeName: `${ps.employee.firstName} ${ps.employee.lastName}`,
    empCode: ps.employee.empCode,
    designation: ps.employee.designation,
    departmentName: ps.employee.department.name,
    month: ps.month,
    year: ps.year,
    totalWeekdays: num(ps.totalWeekdays),
    countedDays: num(ps.countedDays),
    presentDays: num(ps.presentDays),
    paidLeaveDays: num(ps.paidLeaveDays),
    lopDays: num(ps.lopDays),
    basic: num(ps.basic),
    hra: num(ps.hra),
    allowances: num(ps.allowances),
    grossEarnings: num(ps.grossEarnings),
    pfDeduction: num(ps.pfDeduction),
    taxDeduction: num(ps.taxDeduction),
    lopDeduction: num(ps.lopDeduction),
    totalDeductions: num(ps.totalDeductions),
    netPay: num(ps.netPay),
    status: ps.status,
    paidAt: ps.paidAt ? ps.paidAt.toISOString() : null,
  };
}

export const payrollRunInclude = {
  createdBy: true,
  payslips: true,
} as const;

export type PayrollRunWithRelations = Prisma.PayrollRunGetPayload<{
  include: typeof payrollRunInclude;
}>;

export function toPayrollRunDto(
  run: PayrollRunWithRelations
): PayrollRunDto {
  const payslipCount = run.payslips.length;
  const totalNetPay = run.payslips.reduce(
    (sum, p) => sum + num(p.netPay),
    0
  );
  return {
    id: run.id,
    month: run.month,
    year: run.year,
    createdByName: `${run.createdBy.firstName} ${run.createdBy.lastName}`,
    createdAt: run.createdAt.toISOString(),
    payslipCount,
    totalNetPay: Math.round((totalNetPay + Number.EPSILON) * 100) / 100,
  };
}
