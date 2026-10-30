import { NextRequest } from "next/server";
import { handle, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { cancelLeave } from "@/lib/leave";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await params;
    const result = await cancelLeave(session, id);
    return ok(result);
  });
}
