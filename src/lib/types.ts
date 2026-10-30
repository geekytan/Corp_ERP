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
