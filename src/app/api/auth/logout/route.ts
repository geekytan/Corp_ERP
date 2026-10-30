import { handle, ok } from "@/lib/http";
import { clearAuthCookie } from "@/lib/auth";

export async function POST() {
  return handle(async () => {
    await clearAuthCookie();
    return ok({ ok: true });
  });
}
