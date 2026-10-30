import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { handle, HttpError, ok, parseBody } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { departmentSchema } from "@/lib/validators";
import { DepartmentDto } from "@/lib/types";

export async function GET() {
  return handle(async () => {
    await requireSession();

    const depts = await db.department.findMany({
      include: {
        _count: {
          select: { employees: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const dtos: DepartmentDto[] = depts.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      employeeCount: d._count.employees,
    }));

    return ok(dtos);
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    await requireSession(["ADMIN", "HR"]);
    const input = await parseBody(req, departmentSchema);

    try {
      const created = await db.department.create({
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
        id: created.id,
        name: created.name,
        description: created.description,
        employeeCount: created._count.employees,
      };

      return ok(dto, 201);
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
