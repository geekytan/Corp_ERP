import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { PayrollRunDto, SessionUser } from "@/lib/types";
import { fromDateOnly, monthBounds, toDateOnly, todayIST } from "@/lib/date";
import { computeMonthlyAttendance } from "@/lib/attendance";
import { num, payrollRunInclude, toPayrollRunDto } from "@/lib/mappers";

export function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export async function generatePayroll(
  session: SessionUser,
  month: number,
  year: number
): Promise<PayrollRunDto> {
  const today = todayIST();
  const currentYear = parseInt(today.slice(0, 4), 10);
  const currentMonth = parseInt(today.slice(5, 7), 10);

  // Period must not be in the future
  if (year > currentYear || (year === currentYear && month > currentMonth)) {
    throw new HttpError(400, "Cannot run payroll for a future month");
  }

  const { end: monthEnd } = monthBounds(year, month);

  return await db.$transaction(async (tx) => {
    // Check if payroll already generated for this month
    const existing = await tx.payrollRun.findUnique({
      where: {
        month_year: { month, year },
      },
    });

    if (existing) {
      throw new HttpError(409, "Payroll already generated for this month");
    }

    // Find eligible employees: ACTIVE, joinDate <= monthEnd, and has SalaryStructure
    const eligibleEmployees = await tx.employee.findMany({
      where: {
        status: "ACTIVE",
        joinDate: { lte: toDateOnly(monthEnd) },
        salary: { isNot: null },
      },
      include: {
        salary: true,
      },
      orderBy: { empCode: "asc" },
    });

    if (eligibleEmployees.length === 0) {
      throw new HttpError(400, "No eligible employees for this period");
    }

    // Create payroll run
    const run = await tx.payrollRun.create({
      data: {
        month,
        year,
        createdById: session.employeeId,
      },
    });

    // Create payslips
    for (const emp of eligibleEmployees) {
      const sal = emp.salary!;
      const basic = num(sal.basic);
      const hra = num(sal.hra);
      const allowances = num(sal.allowances);
      const pfPercent = num(sal.pfPercent);
      const taxPercent = num(sal.taxPercent);

      const att = await computeMonthlyAttendance(emp.id, month, year);

      const gross = basic + hra + allowances;
      const totalWeekdays = att.totalWeekdays;
      const perDay = totalWeekdays > 0 ? gross / totalWeekdays : 0;

      const lopDeduction = round2(perDay * att.lopDays);
      const pfDeduction = round2((basic * pfPercent) / 100);
      const taxDeduction = round2((gross * taxPercent) / 100);
      const totalDeductions = pfDeduction + taxDeduction + lopDeduction;
      const netPay = gross - totalDeductions;

      await tx.payslip.create({
        data: {
          payrollRunId: run.id,
          employeeId: emp.id,
          month,
          year,
          totalWeekdays: att.totalWeekdays,
          countedDays: att.countedDays,
          presentDays: att.presentEq, // presentEq (half days count 0.5)
          paidLeaveDays: att.paidLeaveDays,
          lopDays: att.lopDays,
          basic,
          hra,
          allowances,
          grossEarnings: gross,
          pfDeduction,
          taxDeduction,
          lopDeduction,
          totalDeductions,
          netPay,
          status: "GENERATED",
        },
      });
    }

    const completedRun = await tx.payrollRun.findUniqueOrThrow({
      where: { id: run.id },
      include: payrollRunInclude,
    });

    return toPayrollRunDto(completedRun);
  });
}
