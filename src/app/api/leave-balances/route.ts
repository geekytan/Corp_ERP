import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { currentYearIST } from "@/lib/date";
import { getLeaveBalances } from "@/lib/leave";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const yearParam = searchParams.get("year");
    const year = yearParam ? parseInt(yearParam, 10) : currentYearIST();
    if (isNaN(year)) {
      throw new HttpError(400, "Invalid year parameter");
    }

    const employeeIdParam = searchParams.get("employeeId");
    let targetEmployeeId = session.employeeId;

    if (employeeIdParam && employeeIdParam !== session.employeeId) {
      if (session.role === "EMPLOYEE") {
        throw new HttpError(
          403,
          "You do not have permission to perform this action"
        );
      }
      if (session.role === "MANAGER") {
        const emp = await db.employee.findUnique({
          where: { id: employeeIdParam },
        });
        if (!emp || emp.managerId !== session.employeeId) {
          throw new HttpError(
            403,
            "You do not have permission to perform this action"
          );
        }
      }
      targetEmployeeId = employeeIdParam;
    }

    const balances = await getLeaveBalances(targetEmployeeId, year);
    return ok(balances);
  });
}
