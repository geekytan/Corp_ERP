import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, ok, parseBody } from "@/lib/http";
import { canViewSalary, requireSession } from "@/lib/rbac";
import { statusSchema } from "@/lib/validators";
import { employeeInclude, toEmployeeDetail } from "@/lib/mappers";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const session = await requireSession(["ADMIN", "HR"]);
    const { id } = await params;
    const input = await parseBody(req, statusSchema);

    const emp = await db.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!emp) {
      throw new HttpError(404, "Employee not found");
    }

    if (id === session.employeeId && input.status === "INACTIVE") {
      throw new HttpError(400, "You cannot deactivate your own account");
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: { status: input.status },
      });

      if (emp.user) {
        await tx.user.update({
          where: { id: emp.user.id },
          data: { isActive: input.status === "ACTIVE" },
        });
      }

      return await tx.employee.findUniqueOrThrow({
        where: { id },
        include: employeeInclude,
      });
    });

    return ok(toEmployeeDetail(updated, canViewSalary(session, id)));
  });
}
