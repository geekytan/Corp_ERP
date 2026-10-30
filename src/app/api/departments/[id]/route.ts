import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { handle, HttpError, ok, parseBody } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { departmentSchema } from "@/lib/validators";
import { DepartmentDto } from "@/lib/types";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    await requireSession(["ADMIN", "HR"]);
    const { id } = await params;
    const input = await parseBody(req, departmentSchema);

    const existing = await db.department.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new HttpError(404, "Department not found");
    }

    try {
      const updated = await db.department.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description || null,
        },
        include: {
          _count: {
            select: { employees: true },
          },
        },
      });

      const dto: DepartmentDto = {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        employeeCount: updated._count.employees,
      };

      return ok(dto);
    } catch (err: unknown) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        throw new HttpError(409, "Department name already exists");
      }
      throw err;
    }
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    await requireSession(["ADMIN", "HR"]);
    const { id } = await params;

    const dept = await db.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: { employees: true },
        },
      },
    });

    if (!dept) {
      throw new HttpError(404, "Department not found");
    }

    if (dept._count.employees > 0) {
      throw new HttpError(409, "Cannot delete a department that has employees");
    }

    await db.department.delete({
      where: { id },
    });

    return ok({ ok: true });
  });
}
