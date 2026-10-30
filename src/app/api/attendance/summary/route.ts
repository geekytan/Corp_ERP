import { NextRequest } from "next/server";
import { handle, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { monthYearQuerySchema } from "@/lib/validators";
import { computeMonthlyAttendanceBulk } from "@/lib/attendance";

export async function GET(req: NextRequest) {
  return handle(async () => {
    await requireSession(["ADMIN", "HR"]);
    const { searchParams } = new URL(req.url);

    const query = monthYearQuerySchema.parse({
      month: searchParams.get("month"),
      year: searchParams.get("year"),
    });

    const summary = await computeMonthlyAttendanceBulk(query.month, query.year);
    return ok(summary);
  });
}
