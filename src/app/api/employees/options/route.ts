import { db } from "@/lib/db";
import { handle, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";

export async function GET() {
  return handle(async () => {
    await requireSession(["ADMIN", "HR"]);

    const employees = await db.employee.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        empCode: true,
      },
    });

    const options = employees.map((e) => ({
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      empCode: e.empCode,
    }));

    return ok(options);
  });
}
