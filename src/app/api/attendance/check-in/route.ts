import { db } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { todayIST, toDateOnly } from "@/lib/date";
import { attendanceInclude, toAttendanceDto } from "@/lib/mappers";

export async function POST() {
  return handle(async () => {
    const session = await requireSession();

    // Check employee active status
    const emp = await db.employee.findUniqueOrThrow({
      where: { id: session.employeeId },
    });
    if (emp.status !== "ACTIVE") {
      throw new HttpError(403, "Your account is inactive");
    }

    const today = todayIST();

    const existing = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.employeeId,
          date: toDateOnly(today),
        },
      },
    });

    if (existing) {
      throw new HttpError(409, "Already checked in today");
    }

    const created = await db.attendance.create({
      data: {
        employeeId: session.employeeId,
        date: toDateOnly(today),
        checkIn: new Date(),
        status: "PRESENT",
        workedMinutes: 0,
      },
      include: attendanceInclude,
    });

    return ok(toAttendanceDto(created), 201);
  });
}
