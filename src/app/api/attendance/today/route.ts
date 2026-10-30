import { db } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { todayIST, toDateOnly } from "@/lib/date";
import { attendanceInclude, toAttendanceDto } from "@/lib/mappers";

export async function GET() {
  return handle(async () => {
    const session = await requireSession();
    const today = todayIST();

    const row = await db.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.employeeId,
          date: toDateOnly(today),
        },
      },
      include: attendanceInclude,
    });

    if (!row) {
      return ok(null);
    }

    return ok(toAttendanceDto(row));
  });
}
