import { Role, SessionUser } from "@/lib/types";
import { getSession } from "@/lib/auth";
import { HttpError } from "@/lib/http";

export async function requireSession(roles?: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new HttpError(401, "Not authenticated");
  }
  if (roles && roles.length > 0 && !roles.includes(session.role)) {
    throw new HttpError(403, "You do not have permission to perform this action");
  }
  return session;
}

export function isAdminOrHr(role: Role): boolean {
  return role === "ADMIN" || role === "HR";
}

export function canViewEmployee(
  session: SessionUser,
  target: { id: string; managerId: string | null }
): boolean {
  if (isAdminOrHr(session.role)) return true;
  if (session.role === "MANAGER") {
    return (
      target.id === session.employeeId ||
      target.managerId === session.employeeId
    );
  }
  return target.id === session.employeeId;
}

export function canViewSalary(
  session: SessionUser,
  targetEmployeeId: string
): boolean {
  if (isAdminOrHr(session.role)) return true;
  return session.employeeId === targetEmployeeId;
}
