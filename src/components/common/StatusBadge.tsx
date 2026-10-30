import React from "react";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  let colorClass = "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100";

  switch (status) {
    case "PRESENT":
    case "APPROVED":
    case "ACTIVE":
    case "PAID":
      colorClass = "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50";
      break;
    case "HALF_DAY":
    case "PENDING":
    case "GENERATED":
      colorClass = "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50";
      break;
    case "REJECTED":
    case "INACTIVE":
      colorClass = "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-50";
      break;
    case "CANCELLED":
      colorClass = "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100";
      break;
  }

  return (
    <Badge variant="outline" className={`font-medium ${colorClass}`}>
      {status.replace("_", " ")}
    </Badge>
  );
}
