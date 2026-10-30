import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { LeaveBalanceDto, LeaveRequestDto, SessionUser } from "@/lib/types";
import { toDateOnly, weekdaysBetween } from "@/lib/date";
import { leaveRequestInclude, toLeaveRequestDto } from "@/lib/mappers";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function ensureLeaveBalances(
  employeeId: string,
  year: number,
  tx: DbClient = db
): Promise<void> {
  const paidTypes = await tx.leaveType.findMany({
    where: { isPaid: true },
  });

  const balancesToCreate = paidTypes.map((lt) => ({
    employeeId,
    leaveTypeId: lt.id,
    year,
    allocated: lt.annualQuota,
    used: 0,
  }));

  if (balancesToCreate.length > 0) {
    await tx.leaveBalance.createMany({
      data: balancesToCreate,
      skipDuplicates: true,
    });
  }
}

export async function getLeaveBalances(
  employeeId: string,
  year: number
): Promise<LeaveBalanceDto[]> {
  await ensureLeaveBalances(employeeId, year);

  const rows = await db.leaveBalance.findMany({
    where: { employeeId, year },
    include: { leaveType: true },
    orderBy: { leaveType: { name: "asc" } },
  });

  return rows.map((r) => ({
    leaveTypeId: r.leaveTypeId,
    leaveTypeName: r.leaveType.name,
    isPaid: r.leaveType.isPaid,
    year: r.year,
    allocated: r.allocated,
    used: r.used,
    remaining: r.allocated - r.used,
  }));
}

export interface ApplyLeaveInput {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export async function applyForLeave(
  session: SessionUser,
  input: ApplyLeaveInput
): Promise<LeaveRequestDto> {
  // 1. Date order
  if (input.endDate < input.startDate) {
    throw new HttpError(400, "End date cannot be before start date");
  }

  // 2. No working days
  const days = weekdaysBetween(input.startDate, input.endDate);
  if (days < 1) {
    throw new HttpError(400, "Selected range contains no working days");
  }

  // 3. Year span
  const startYear = parseInt(input.startDate.slice(0, 4), 10);
  const endYear = parseInt(input.endDate.slice(0, 4), 10);
  if (startYear !== endYear) {
    throw new HttpError(400, "Leave request cannot span two calendar years");
  }

  // 4. Overlap rule
  const overlapping = await db.leaveRequest.findFirst({
    where: {
      employeeId: session.employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: toDateOnly(input.endDate) },
      endDate: { gte: toDateOnly(input.startDate) },
    },
  });
  if (overlapping) {
    throw new HttpError(
      409,
      "You already have a pending or approved leave overlapping these dates"
    );
  }

  // 5. Balance rule (paid types only)
  const leaveType = await db.leaveType.findUnique({
    where: { id: input.leaveTypeId },
  });
  if (!leaveType) {
    throw new HttpError(404, "Leave type not found");
  }

  if (leaveType.isPaid) {
    await ensureLeaveBalances(session.employeeId, startYear);
    const balance = await db.leaveBalance.findUnique({
      where: {
        employeeId_leaveTypeId_year: {
          employeeId: session.employeeId,
          leaveTypeId: leaveType.id,
          year: startYear,
        },
      },
    });
    const remaining = balance ? balance.allocated - balance.used : 0;
    if (days > remaining) {
      throw new HttpError(400, "Insufficient leave balance");
    }
  }

  const created = await db.leaveRequest.create({
    data: {
      employeeId: session.employeeId,
      leaveTypeId: leaveType.id,
      startDate: toDateOnly(input.startDate),
      endDate: toDateOnly(input.endDate),
      days,
      reason: input.reason,
      status: "PENDING",
    },
    include: leaveRequestInclude,
  });

  return toLeaveRequestDto(created);
}

export async function decideLeave(
  session: SessionUser,
  id: string,
  decision: "APPROVED" | "REJECTED",
  comment?: string | null
): Promise<LeaveRequestDto> {
  const req = await db.leaveRequest.findUnique({
    where: { id },
    include: {
      employee: true,
      leaveType: true,
    },
  });

  if (!req) {
    throw new HttpError(404, "Leave request not found");
  }

  if (req.status !== "PENDING") {
    throw new HttpError(409, "Request already processed");
  }

  if (req.employeeId === session.employeeId) {
    throw new HttpError(403, "You cannot review your own request");
  }

  const isManager = req.employee.managerId === session.employeeId;
  const isHrOrAdmin = session.role === "ADMIN" || session.role === "HR";
  if (!isManager && !isHrOrAdmin) {
    throw new HttpError(403, "You are not allowed to review this request");
  }

  if (decision === "APPROVED") {
    return await db.$transaction(async (tx) => {
      if (req.leaveType.isPaid) {
        const leaveYear = req.startDate.getUTCFullYear();
        await ensureLeaveBalances(req.employeeId, leaveYear, tx);
        const bal = await tx.leaveBalance.findUnique({
          where: {
            employeeId_leaveTypeId_year: {
              employeeId: req.employeeId,
              leaveTypeId: req.leaveTypeId,
              year: leaveYear,
            },
          },
        });
        const remaining = bal ? bal.allocated - bal.used : 0;
        if (remaining < req.days) {
          throw new HttpError(409, "Insufficient leave balance");
        }
        await tx.leaveBalance.update({
          where: { id: bal!.id },
          data: { used: bal!.used + req.days },
        });
      }

      const updated = await tx.leaveRequest.update({
        where: { id: req.id },
        data: {
          status: "APPROVED",
          reviewerId: session.employeeId,
          reviewComment: comment || null,
          reviewedAt: new Date(),
        },
        include: leaveRequestInclude,
      });

      return toLeaveRequestDto(updated);
    });
  }

  // REJECTED
  const updated = await db.leaveRequest.update({
    where: { id: req.id },
    data: {
      status: "REJECTED",
      reviewerId: session.employeeId,
      reviewComment: comment || null,
      reviewedAt: new Date(),
    },
    include: leaveRequestInclude,
  });

  return toLeaveRequestDto(updated);
}

export async function cancelLeave(
  session: SessionUser,
  id: string
): Promise<LeaveRequestDto> {
  const req = await db.leaveRequest.findUnique({
    where: { id },
  });

  if (!req) {
    throw new HttpError(404, "Leave request not found");
  }

  if (req.employeeId !== session.employeeId) {
    throw new HttpError(403, "You do not have permission to perform this action");
  }

  if (req.status !== "PENDING") {
    throw new HttpError(409, "Request already processed");
  }

  const updated = await db.leaveRequest.update({
    where: { id: req.id },
    data: { status: "CANCELLED" },
    include: leaveRequestInclude,
  });

  return toLeaveRequestDto(updated);
}
