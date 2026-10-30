import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { handle, HttpError, ok, parseBody } from "@/lib/http";
import { canViewEmployee, requireSession } from "@/lib/rbac";
import { createEmployeeSchema } from "@/lib/validators";
import {
  employeeInclude,
  toEmployeeDetail,
  toEmployeeListItem,
} from "@/lib/mappers";
import { currentYearIST, toDateOnly } from "@/lib/date";
import { env } from "@/lib/env";
import { ensureLeaveBalances } from "@/lib/leave";
import { Paginated, EmployeeListItem } from "@/lib/types";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    if (session.role === "EMPLOYEE") {
      throw new HttpError(403, "You do not have permission to perform this action");
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const departmentId = searchParams.get("departmentId") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10))
    );

    const where: Prisma.EmployeeWhereInput = {};

    if (session.role === "MANAGER") {
      where.OR = [
        { managerId: session.employeeId },
        { id: session.employeeId },
      ];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status === "ACTIVE" || status === "INACTIVE") {
      where.status = status;
    }

    if (search) {
      const searchFilter: Prisma.EmployeeWhereInput = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { empCode: { contains: search, mode: "insensitive" } },
          { user: { email: { contains: search, mode: "insensitive" } } },
        ],
      };
      if (where.OR) {
        where.AND = [{ OR: where.OR }, searchFilter];
        delete where.OR;
      } else {
        where.OR = searchFilter.OR;
      }
    }

    const [total, items] = await Promise.all([
      db.employee.count({ where }),
      db.employee.findMany({
        where,
        include: employeeInclude,
        orderBy: { empCode: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const result: Paginated<EmployeeListItem> = {
      items: items.map(toEmployeeListItem),
      total,
      page,
      pageSize,
    };

    return ok(result);
  });
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession(["ADMIN", "HR"]);
    const input = await parseBody(req, createEmployeeSchema);

    // HR cannot create an ADMIN user
    if (input.role === "ADMIN" && session.role !== "ADMIN") {
      throw new HttpError(
        403,
        "Only an admin can assign or change the admin role"
      );
    }

    // Verify department exists
    const dept = await db.department.findUnique({
      where: { id: input.departmentId },
    });
    if (!dept) {
      throw new HttpError(400, "Selected department is invalid");
    }

    // Verify manager exists and is active if provided
    if (input.managerId) {
      const mgr = await db.employee.findUnique({
        where: { id: input.managerId },
      });
      if (!mgr || mgr.status !== "ACTIVE") {
        throw new HttpError(400, "Selected manager is invalid");
      }
    }

    // Check email uniqueness
    const emailLower = input.email.toLowerCase();
    const existingUser = await db.user.findUnique({
      where: { email: emailLower },
    });
    if (existingUser) {
      throw new HttpError(409, "Email already in use");
    }

    // Generate empCode: "EMP" + (highest numeric suffix + 1) zero padded to 3 digits
    const allEmps = await db.employee.findMany({
      select: { empCode: true },
    });
    let maxSuffix = 0;
    for (const e of allEmps) {
      const match = e.empCode.match(/^EMP(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxSuffix) maxSuffix = val;
      }
    }
    const nextCode = `EMP${(maxSuffix + 1).toString().padStart(3, "0")}`;

    const defaultPassword = env.DEFAULT_EMPLOYEE_PASSWORD;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const created = await db.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          empCode: nextCode,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone || null,
          designation: input.designation,
          departmentId: input.departmentId,
          managerId: input.managerId || null,
          joinDate: toDateOnly(input.joinDate),
          status: "ACTIVE",
        },
      });

      await tx.user.create({
        data: {
          email: emailLower,
          passwordHash,
          role: input.role,
          isActive: true,
          employeeId: emp.id,
        },
      });

      await tx.salaryStructure.create({
        data: {
          employeeId: emp.id,
          basic: input.basic,
          hra: input.hra,
          allowances: input.allowances,
          pfPercent: input.pfPercent,
          taxPercent: input.taxPercent,
        },
      });

      await ensureLeaveBalances(emp.id, currentYearIST(), tx);

      return await tx.employee.findUniqueOrThrow({
        where: { id: emp.id },
        include: employeeInclude,
      });
    });

    return ok(toEmployeeDetail(created, true), 201);
  });
}
