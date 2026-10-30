import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, ok, parseBody } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { salarySchema } from "@/lib/validators";
import { toSalaryDto } from "@/lib/mappers";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    await requireSession(["ADMIN", "HR"]);
    const { id } = await params;
    const input = await parseBody(req, salarySchema);

    const emp = await db.employee.findUnique({
      where: { id },
    });

    if (!emp) {
      throw new HttpError(404, "Employee not found");
    }

    const salary = await db.salaryStructure.upsert({
      where: { employeeId: id },
      create: {
        employeeId: id,
        basic: input.basic,
        hra: input.hra,
        allowances: input.allowances,
        pfPercent: input.pfPercent,
        taxPercent: input.taxPercent,
      },
      update: {
        basic: input.basic,
        hra: input.hra,
        allowances: input.allowances,
        pfPercent: input.pfPercent,
        taxPercent: input.taxPercent,
      },
    });

    return ok(toSalaryDto(salary));
  });
}
