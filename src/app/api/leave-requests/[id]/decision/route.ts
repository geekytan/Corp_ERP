import { NextRequest } from "next/server";
import { handle, parseBody, ok } from "@/lib/http";
import { requireSession } from "@/lib/rbac";
import { leaveDecisionSchema } from "@/lib/validators";
import { decideLeave } from "@/lib/leave";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handle(async () => {
    const session = await requireSession();
    const { id } = await params;
    const input = await parseBody(req, leaveDecisionSchema);

    const result = await decideLeave(
      session,
      id,
      input.decision,
      input.comment
    );

    return ok(result);
  });
}
