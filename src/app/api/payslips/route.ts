import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { payslipInclude, toPayslipDto } from "@/lib/mappers";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const yearParam = searchParams.get("year");
    const where: Prisma.PayslipWhereInput = {
      employeeId: session.employeeId,
    };

    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (isNaN(year)) {
        throw new HttpError(400, "Invalid year parameter");
      }
      where.year = year;
    }

    const payslips = await db.payslip.findMany({
      where,
      include: payslipInclude,
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return ok(payslips.map(toPayslipDto));
  });
}
