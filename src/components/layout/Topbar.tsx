"use client";

import React, { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { api } from "@/lib/api-client";
import { LogOut } from "lucide-react";

export function Topbar() {
  const { user } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.post("/api/auth/logout");
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 print:hidden">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-lg font-bold text-indigo-600">CorpERP</span>
      </div>
      <div className="hidden md:block" />

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{user.name}</p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <StatusBadge status={user.role} />
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={loggingOut}
          className="text-slate-600 hover:text-slate-900 gap-1.5"
        >
          <LogOut className="size-3.5" />
          <span>Logout</span>
        </Button>
      </div>
    </header>
  );
}
