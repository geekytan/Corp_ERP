import { db } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import {
  AdminHrDashboard,
  DashboardDto,
  EmployeeDashboard,
  ManagerDashboard,
} from "@/lib/types";
import {
  addDays,
  currentYearIST,
  isWeekday,
  monthLabel,
  toDateOnly,
  todayIST,
} from "@/lib/date";
import { num, payslipInclude, toPayslipDto } from "@/lib/mappers";
import { getLeaveBalances } from "@/lib/leave";

export async function GET() {
  return handle(async () => {
    const session = await requireSession();
    const today = todayIST();

    if (session.role === "ADMIN" || session.role === "HR") {
      const [
        totalEmployees,
        activeEmployees,
        presentToday,
        pendingLeaveRequests,
        depts,
        recentRuns,
      ] = await Promise.all([
        db.employee.count(),
        db.employee.count({ where: { status: "ACTIVE" } }),
        db.attendance.count({ where: { date: toDateOnly(today) } }),
        db.leaveRequest.count({
          where: {
            status: "PENDING",
            employeeId: { not: session.employeeId },
          },
        }),
        db.department.findMany({
          orderBy: { name: "asc" },
          include: {
            employees: {
              where: { status: "ACTIVE" },
              select: { id: true },
            },
          },
        }),
        db.payrollRun.findMany({
          take: 6,
          orderBy: [{ year: "desc" }, { month: "desc" }],
          include: {
            payslips: {
              select: { netPay: true },
            },
          },
        }),
      ]);

      let onLeaveToday = 0;
      if (isWeekday(today)) {
        const leaveRows = await db.leaveRequest.findMany({
          where: {
            status: "APPROVED",
            startDate: { lte: toDateOnly(today) },
            endDate: { gte: toDateOnly(today) },
          },
          select: { employeeId: true },
          distinct: ["employeeId"],
        });
        onLeaveToday = leaveRows.length;
      }

      const departmentHeadcount = depts.map((d) => ({
        name: d.name,
        count: d.employees.length,
      }));

      // Last 7 calendar days ending today
      const attendanceLast7Days: { date: string; present: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = addDays(today, -i);
        const count = await db.attendance.count({
          where: { date: toDateOnly(d) },
        });
        attendanceLast7Days.push({ date: d, present: count });
      }

      const payrollLast6Runs = recentRuns.reverse().map((r) => {
        const netTotal = r.payslips.reduce((acc, p) => acc + num(p.netPay), 0);
        return {
          label: monthLabel(r.month, r.year),
          netTotal: Math.round((netTotal + Number.EPSILON) * 100) / 100,
        };
      });

      const data: AdminHrDashboard = {
        view: "ADMIN_HR",
        totalEmployees,
        activeEmployees,
        presentToday,
        onLeaveToday,
        pendingLeaveRequests,
        departmentHeadcount,
        attendanceLast7Days,
        payrollLast6Runs,
      };

      return ok<DashboardDto>(data);
    }

    if (session.role === "MANAGER") {
      const reports = await db.employee.findMany({
        where: {
          managerId: session.employeeId,
          status: "ACTIVE",
        },
        select: { id: true },
      });

      const teamSize = reports.length;
      const reportIds = reports.map((r) => r.id);

      let teamPresentToday = 0;
      let teamOnLeaveToday = 0;

      if (reportIds.length > 0) {
        teamPresentToday = await db.attendance.count({
          where: {
            employeeId: { in: reportIds },
            date: toDateOnly(today),
          },
        });

        if (isWeekday(today)) {
          const onLeave = await db.leaveRequest.findMany({
            where: {
              employeeId: { in: reportIds },
              status: "APPROVED",
              startDate: { lte: toDateOnly(today) },
              endDate: { gte: toDateOnly(today) },
            },
            select: { employeeId: true },
            distinct: ["employeeId"],
          });
          teamOnLeaveToday = onLeave.length;
        }
      }

      const pendingApprovals =
        reportIds.length > 0
          ? await db.leaveRequest.count({
              where: {
                employeeId: { in: reportIds },
                status: "PENDING",
              },
            })
          : 0;

      const data: ManagerDashboard = {
        view: "MANAGER",
        teamSize,
        teamPresentToday,
        teamOnLeaveToday,
        pendingApprovals,
      };

      return ok<DashboardDto>(data);
    }

    // EMPLOYEE
    const [leaveBalances, pendingRequests, latestPayslipRow] =
      await Promise.all([
        getLeaveBalances(session.employeeId, currentYearIST()),
        db.leaveRequest.count({
          where: {
            employeeId: session.employeeId,
            status: "PENDING",
          },
        }),
        db.payslip.findFirst({
          where: { employeeId: session.employeeId },
          include: payslipInclude,
          orderBy: [{ year: "desc" }, { month: "desc" }],
        }),
      ]);

    const data: EmployeeDashboard = {
      view: "EMPLOYEE",
      leaveBalances,
      pendingRequests,
      latestPayslip: latestPayslipRow ? toPayslipDto(latestPayslipRow) : null,
    };

    return ok<DashboardDto>(data);
  });
}
