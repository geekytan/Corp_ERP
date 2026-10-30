import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { handle, HttpError, ok, parseBody } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { leaveRequestSchema } from "@/lib/validators";
import { applyForLeave } from "@/lib/leave";
import { leaveRequestInclude, toLeaveRequestDto } from "@/lib/mappers";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    const { searchParams } = new URL(req.url);

    const scope = searchParams.get("scope");
    if (!scope || (scope !== "mine" && scope !== "approvals")) {
      throw new HttpError(400, "Invalid or missing scope query parameter");
    }

    const status = searchParams.get("status") as Prisma.EnumLeaveStatusFilter | undefined;

    const where: Prisma.LeaveRequestWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (scope === "mine") {
      where.employeeId = session.employeeId;
    } else {
      // approvals
      if (session.role === "EMPLOYEE") {
        throw new HttpError(
          403,
          "You do not have permission to perform this action"
        );
      }

      if (session.role === "MANAGER") {
        where.employee = {
          managerId: session.employeeId,
        };
        where.employeeId = { not: session.employeeId };
      } else {
        // ADMIN or HR: all except own
        where.employeeId = { not: session.employeeId };
      }
    }

    const rows = await db.leaveRequest.findMany({
      where,
      include: leaveRequestInclude,
      orderBy: { createdAt: "desc" },
    });

    return ok(rows.map(toLeaveRequestDto));
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    const input = await parseBody(req, leaveRequestSchema);
    const result = await applyForLeave(session, input);
    return ok(result, 201);
  });
}
