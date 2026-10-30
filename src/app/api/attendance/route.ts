import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { monthYearQuerySchema } from "@/lib/validators";
import { monthBounds, toDateOnly } from "@/lib/date";
import { attendanceInclude, toAttendanceDto } from "@/lib/mappers";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const query = monthYearQuerySchema.parse({
      month: searchParams.get("month"),
      year: searchParams.get("year"),
    });

    const targetEmployeeId = searchParams.get("employeeId");

    let filterEmployeeId: string | undefined;

    if (session.role === "EMPLOYEE") {
      if (targetEmployeeId && targetEmployeeId !== session.employeeId) {
        throw new HttpError(
          403,
          "You do not have permission to perform this action"
        );
      }
      filterEmployeeId = session.employeeId;
    } else if (session.role === "MANAGER") {
      if (targetEmployeeId) {
        if (targetEmployeeId !== session.employeeId) {
          const target = await db.employee.findUnique({
            where: { id: targetEmployeeId },
          });
          if (!target || target.managerId !== session.employeeId) {
            throw new HttpError(
              403,
              "You do not have permission to perform this action"
            );
          }
        }
        filterEmployeeId = targetEmployeeId;
      } else {
        filterEmployeeId = session.employeeId;
      }
    } else {
      // ADMIN or HR
      if (targetEmployeeId) {
        filterEmployeeId = targetEmployeeId;
      }
    }

    const { start, end } = monthBounds(query.year, query.month);

    const where: Prisma.AttendanceWhereInput = {
      date: {
        gte: toDateOnly(start),
        lte: toDateOnly(end),
      },
    };

    if (filterEmployeeId) {
      where.employeeId = filterEmployeeId;
    }

    const rows = await db.attendance.findMany({
      where,
      include: attendanceInclude,
      orderBy: [{ date: "desc" }, { employee: { empCode: "asc" } }],
    });

    return ok(rows.map(toAttendanceDto));
  });
}
