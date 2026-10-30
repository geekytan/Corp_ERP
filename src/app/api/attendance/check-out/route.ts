import { db } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { todayIST, toDateOnly } from "@/lib/date";
import { attendanceInclude, toAttendanceDto } from "@/lib/mappers";
import { env } from "@/lib/env";

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

    const row = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.employeeId,
          date: toDateOnly(today),
        },
      },
    });

    if (!row) {
      throw new HttpError(409, "You have not checked in today");
    }

    if (row.checkOut) {
      throw new HttpError(409, "Already checked out today");
    }

    const checkOut = new Date();
    const workedMinutes = Math.floor(
      (checkOut.getTime() - row.checkIn.getTime()) / 60000
    );
    const status =
      workedMinutes < env.HALF_DAY_THRESHOLD_MINUTES ? "HALF_DAY" : "PRESENT";

    const updated = await db.attendance.update({
      where: { id: row.id },
      data: {
        checkOut,
        workedMinutes,
        status,
      },
      include: attendanceInclude,
    });

    return ok(toAttendanceDto(updated));
  });
}
