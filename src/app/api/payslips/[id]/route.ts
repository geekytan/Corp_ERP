import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/http";
import { isAdminOrHr, requireSession } from "@/lib/rbac";
import { payslipInclude, toPayslipDto } from "@/lib/mappers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await params;

    const payslip = await db.payslip.findUnique({
      where: { id },
      include: payslipInclude,
    });

    if (!payslip) {
      throw new HttpError(404, "Payslip not found");
    }

    if (
      payslip.employeeId !== session.employeeId &&
      !isAdminOrHr(session.role)
    ) {
      throw new HttpError(
        403,
        "You do not have permission to perform this action"
      );
    }

    return ok(toPayslipDto(payslip));
  });
}
