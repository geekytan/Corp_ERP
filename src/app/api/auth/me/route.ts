import { handle, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";

export async function GET() {
  return handle(async () => {
    const session = await requireSession();
    return ok(session);
  });
}
