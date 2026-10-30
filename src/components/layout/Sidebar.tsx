"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  CalendarDays,
  CheckCircle2,
  Wallet,
  FileText,
  User,
} from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { Role } from "@/lib/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Employees",
    href: "/employees",
    icon: Users,
    roles: ["ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Departments",
    href: "/departments",
    icon: Building2,
    roles: ["ADMIN", "HR"],
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: Clock,
    roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Leave",
    href: "/leave",
    icon: CalendarDays,
    roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Leave Approvals",
    href: "/leave/approvals",
    icon: CheckCircle2,
    roles: ["ADMIN", "HR", "MANAGER"],
  },
  {
    label: "Payroll",
    href: "/payroll",
    icon: Wallet,
    roles: ["ADMIN", "HR"],
  },
  {
    label: "My Payslips",
    href: "/payslips",
    icon: FileText,
    roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
  },
  {
    label: "Profile",
    href: "/profile",
    icon: User,
    roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
  },
];

export function Sidebar() {
  const { user } = useSession();
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <aside className="hidden md:flex flex-col w-60 bg-white border-r border-slate-200 shrink-0 print:hidden min-h-screen">
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <span className="text-xl font-bold text-indigo-600 tracking-tight">
          CorpERP
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="size-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
