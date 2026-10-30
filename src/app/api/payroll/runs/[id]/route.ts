import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import {
  payrollRunInclude,
  payslipInclude,
  toPayrollRunDto,
  toPayslipDto,
} from "@/lib/mappers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    await requireSession(["ADMIN", "HR"]);
    const { id } = await params;

    const run = await db.payrollRun.findUnique({
      where: { id },
      include: payrollRunInclude,
    });

    if (!run) {
      throw new HttpError(404, "Payroll run not found");
    }

    const payslips = await db.payslip.findMany({
      where: { payrollRunId: id },
      include: payslipInclude,
      orderBy: { employee: { empCode: "asc" } },
    });

    return ok({
      run: toPayrollRunDto(run),
      payslips: payslips.map(toPayslipDto),
    });
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    await requireSession(["ADMIN"]);
    const { id } = await params;

    const run = await db.payrollRun.findUnique({
      where: { id },
    });

    if (!run) {
      throw new HttpError(404, "Payroll run not found");
    }

    await db.payrollRun.delete({
      where: { id },
    });

    return ok({ ok: true });
  });
}
