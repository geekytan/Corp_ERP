import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { AttendanceSummaryRow } from "@/lib/types";
import {
  eachWeekday,
  fromDateOnly,
  maxDate,
  minDate,
  monthBounds,
  toDateOnly,
  todayIST,
  weekdaysBetween,
  isWeekday,
} from "@/lib/date";

export interface MonthlyAttendanceResult {
  totalWeekdays: number;
  countedDays: number;
  presentDays: number;
  halfDays: number;
  presentEq: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
  lopDays: number;
}

export async function computeMonthlyAttendance(
  employeeId: string,
  month: number,
  year: number
): Promise<MonthlyAttendanceResult> {
  const employee = await db.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new HttpError(404, "Employee not found");
  }

  const { start: monthStart, end: monthEnd } = monthBounds(year, month);
  const totalWeekdays = weekdaysBetween(monthStart, monthEnd);

  const empJoinDate = fromDateOnly(employee.joinDate);
  const today = todayIST();

  const rangeStart = maxDate(monthStart, empJoinDate);
  const rangeEnd = minDate(monthEnd, today);

  let countedDays = 0;
  let presentDays = 0;
  let halfDays = 0;
  let presentEq = 0;
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;
  let lopDays = 0;
  let absentDays = 0;

  if (rangeStart <= rangeEnd) {
    countedDays = weekdaysBetween(rangeStart, rangeEnd);

    // Attendance rows
    const attendanceRows = await db.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: toDateOnly(rangeStart),
          lte: toDateOnly(rangeEnd),
        },
      },
    });

    for (const row of attendanceRows) {
      const rowDateStr = fromDateOnly(row.date);
      if (isWeekday(rowDateStr)) {
        if (row.status === "PRESENT") {
          presentDays++;
        } else if (row.status === "HALF_DAY") {
          halfDays++;
        }
      }
    }
    presentEq = presentDays + 0.5 * halfDays;

    // Leave requests
    const leaveRequests = await db.leaveRequest.findMany({
      where: {
        employeeId,
        status: "APPROVED",
        startDate: { lte: toDateOnly(rangeEnd) },
        endDate: { gte: toDateOnly(rangeStart) },
      },
      include: { leaveType: true },
    });

    const paidLeaveSet = new Set<string>();
    const unpaidLeaveSet = new Set<string>();

    for (const req of leaveRequests) {
      const reqStart = maxDate(rangeStart, fromDateOnly(req.startDate));
      const reqEnd = minDate(rangeEnd, fromDateOnly(req.endDate));
      const days = eachWeekday(reqStart, reqEnd);

      for (const d of days) {
        if (req.leaveType.isPaid) {
          paidLeaveSet.add(d);
        } else {
          unpaidLeaveSet.add(d);
        }
      }
    }

    paidLeaveDays = paidLeaveSet.size;
    unpaidLeaveDays = unpaidLeaveSet.size;

    lopDays = Math.max(0, countedDays - presentEq - paidLeaveDays);
    absentDays = Math.max(
      0,
      countedDays - presentEq - paidLeaveDays - unpaidLeaveDays
    );
  }

  return {
    totalWeekdays,
    countedDays,
    presentDays,
    halfDays,
    presentEq,
    paidLeaveDays,
    unpaidLeaveDays,
    absentDays,
    lopDays,
  };
}

export async function computeMonthlyAttendanceBulk(
  month: number,
  year: number
): Promise<AttendanceSummaryRow[]> {
  const activeEmployees = await db.employee.findMany({
    where: { status: "ACTIVE" },
    orderBy: { empCode: "asc" },
  });

  const rows = await Promise.all(
    activeEmployees.map(async (emp) => {
      const att = await computeMonthlyAttendance(emp.id, month, year);
      return {
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        empCode: emp.empCode,
        totalWeekdays: att.totalWeekdays,
        countedDays: att.countedDays,
        presentDays: att.presentDays,
        halfDays: att.halfDays,
        paidLeaveDays: att.paidLeaveDays,
        unpaidLeaveDays: att.unpaidLeaveDays,
        absentDays: att.absentDays,
        lopDays: att.lopDays,
      };
    })
  );

  return rows;
}
