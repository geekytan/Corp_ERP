import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingBlock({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
      <Loader2 className="size-6 animate-spin text-indigo-600" />
      <span className="text-sm font-medium">{text}</span>
    </div>
  );
}
