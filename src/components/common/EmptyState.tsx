import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface EmptyStateProps {
  message: string;
  action?: React.ReactNode;
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <Card className="bg-white border-dashed border-slate-300">
      <CardContent className="p-8 text-center flex flex-col items-center justify-center">
        <p className="text-slate-500 text-sm">{message}</p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}
