import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, ok, parseBody } from "@/lib/http";
import { canViewEmployee, canViewSalary, requireSession } from "@/lib/rbac";
import { updateEmployeeSchema } from "@/lib/validators";
import { employeeInclude, toEmployeeDetail } from "@/lib/mappers";
import { toDateOnly } from "@/lib/date";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await params;

    const emp = await db.employee.findUnique({
      where: { id },
      include: employeeInclude,
    });

    if (!emp) {
      throw new HttpError(404, "Employee not found");
    }

    if (!canViewEmployee(session, emp)) {
      throw new HttpError(403, "You do not have permission to perform this action");
    }

    const includeSalary = canViewSalary(session, emp.id);
    return ok(toEmployeeDetail(emp, includeSalary));
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const session = await requireSession(["ADMIN", "HR"]);
    const { id } = await params;
    const input = await parseBody(req, updateEmployeeSchema);

    const emp = await db.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!emp) {
      throw new HttpError(404, "Employee not found");
    }

    // Role checks
    if (session.role !== "ADMIN") {
      if (emp.user?.role === "ADMIN" || input.role === "ADMIN") {
        throw new HttpError(
          403,
          "Only an admin can assign or change the admin role"
        );
      }
    }

    // Department check
    const dept = await db.department.findUnique({
      where: { id: input.departmentId },
    });
    if (!dept) {
      throw new HttpError(400, "Selected department is invalid");
    }

    // Manager check
    if (input.managerId) {
      if (input.managerId === id) {
        throw new HttpError(400, "An employee cannot be their own manager");
      }
      const mgr = await db.employee.findUnique({
        where: { id: input.managerId },
      });
      if (!mgr || mgr.status !== "ACTIVE") {
        throw new HttpError(400, "Selected manager is invalid");
      }
    }

    // Email uniqueness check
    const emailLower = input.email.toLowerCase();
    if (emp.user && emp.user.email !== emailLower) {
      const existing = await db.user.findUnique({
        where: { email: emailLower },
      });
      if (existing) {
        throw new HttpError(409, "Email already in use");
      }
    }

    const updated = await db.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone || null,
          designation: input.designation,
          departmentId: input.departmentId,
          managerId: input.managerId || null,
          joinDate: toDateOnly(input.joinDate),
        },
      });

      if (emp.user) {
        await tx.user.update({
          where: { id: emp.user.id },
          data: {
            email: emailLower,
            role: input.role,
          },
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
