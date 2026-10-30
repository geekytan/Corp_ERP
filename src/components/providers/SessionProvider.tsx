"use client";

import React, { createContext, useContext } from "react";
import { SessionUser } from "@/lib/types";

interface SessionContextType {
  user: SessionUser;
}

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return (
    <SessionContext.Provider value={{ user }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextType {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}
