import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, ok, parseBody } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { payrollRunSchema } from "@/lib/validators";
import { generatePayroll } from "@/lib/payroll";
import { payrollRunInclude, toPayrollRunDto } from "@/lib/mappers";

export async function GET() {
  return handle(async () => {
    await requireSession(["ADMIN", "HR"]);

    const runs = await db.payrollRun.findMany({
      include: payrollRunInclude,
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return ok(runs.map(toPayrollRunDto));
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession(["ADMIN", "HR"]);
    const input = await parseBody(req, payrollRunSchema);

    const runDto = await generatePayroll(session, input.month, input.year);
    return ok(runDto, 201);
  });
}
