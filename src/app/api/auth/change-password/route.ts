import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { handle, HttpError, ok, parseBody } from "@/lib/http";
import { changePasswordSchema } from "@/lib/validators";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { requireSession } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireSession();
    const input = await parseBody(req, changePasswordSchema);

    const user = await db.user.findUniqueOrThrow({
      where: { id: session.id },
    });

    const valid = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new HttpError(400, "Current password is incorrect");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return ok({ ok: true });
  });
}
