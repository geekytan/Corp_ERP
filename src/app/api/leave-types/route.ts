import { db } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { LeaveTypeDto } from "@/lib/types";

export async function GET() {
  return handle(async () => {
    await requireSession();

    const types = await db.leaveType.findMany({
      orderBy: { name: "asc" },
    });

    const dtos: LeaveTypeDto[] = types.map((t) => ({
      id: t.id,
      name: t.name,
      annualQuota: t.annualQuota,
      isPaid: t.isPaid,
    }));

    return ok(dtos);
  });
}
