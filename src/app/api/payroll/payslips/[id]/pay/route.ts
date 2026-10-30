import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { payslipInclude, toPayslipDto } from "@/lib/mappers";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    await requireSession(["ADMIN", "HR"]);
    const { id } = await params;

    const payslip = await db.payslip.findUnique({
      where: { id },
      include: payslipInclude,
    });

    if (!payslip) {
      throw new HttpError(404, "Payslip not found");
    }

    if (payslip.status === "PAID") {
      throw new HttpError(409, "Payslip already marked as paid");
    }

    const updated = await db.payslip.update({
      where: { id },
      data: {
        status: "PAID",
        paidAt: new Date(),
      },
      include: payslipInclude,
    });

    return ok(toPayslipDto(updated));
  });
}
