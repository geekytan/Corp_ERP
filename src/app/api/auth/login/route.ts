import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, ok, parseBody } from "@/lib/http";
import { loginSchema } from "@/lib/validators";
import { setAuthCookie, signToken, verifyPassword } from "@/lib/auth";
import { SessionUser } from "@/lib/types";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const input = await parseBody(req, loginSchema);
    const email = input.email.toLowerCase();

    const user = await db.user.findUnique({
      where: { email },
      include: { employee: true },
    });

    if (!user || !user.isActive || !user.employee || user.employee.status === "INACTIVE") {
      throw new HttpError(401, "Invalid email or password");
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new HttpError(401, "Invalid email or password");
    }

    const token = await signToken({
      sub: user.id,
      employeeId: user.employee.id,
      role: user.role,
    });

    await setAuthCookie(token);

    const sessionUser: SessionUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employee.id,
      name: `${user.employee.firstName} ${user.employee.lastName}`,
    };

    return ok(sessionUser);
  });
}
