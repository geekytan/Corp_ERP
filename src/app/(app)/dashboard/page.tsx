"use client";

import React from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSession } from "@/components/providers/SessionProvider";
import { useApi } from "@/hooks/useApi";
import { DashboardDto } from "@/lib/types";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { CheckInCard } from "@/components/attendance/CheckInCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate, formatINR, monthName } from "@/lib/format";
import {
  Users,
  UserCheck,
  CalendarOff,
  Clock,
  CheckCircle2,
  FileText,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useSession();
  const { data, loading, error, reload } = useApi<DashboardDto>("/api/dashboard");

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome back, ${user.name}`}
        />
        <CheckInCard onChange={reload} />
        <LoadingBlock />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome back, ${user.name}`}
        />
        <CheckInCard onChange={reload} />
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600 flex items-center justify-between">
          <p>{error || "Failed to load dashboard data"}</p>
          <Button variant="outline" size="sm" onClick={reload}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user.name}`}
      />
      <CheckInCard onChange={reload} />

      {data.view === "ADMIN_HR" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Employees"
              value={data.totalEmployees}
              icon={<Users className="size-6" />}
            />
            <StatCard
              label="Present Today"
              value={data.presentToday}
              icon={<UserCheck className="size-6" />}
            />
            <StatCard
              label="On Leave Today"
              value={data.onLeaveToday}
              icon={<CalendarOff className="size-6" />}
            />
            <StatCard
              label="Pending Leave Requests"
              value={data.pendingLeaveRequests}
              icon={<Clock className="size-6" />}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Headcount by Department
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.departmentHeadcount}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Attendance – Last 7 Days
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.attendanceLast7Days.map((d) => ({
                      ...d,
                      formattedDate: formatDate(d.date).slice(0, 6),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="formattedDate"
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      axisLine={{ stroke: "#cbd5e1" }}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="present"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#4f46e5" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Net Payroll – Last 6 Runs
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.payrollLast6Runs.length === 0 ? (
                <EmptyState message="No payroll runs yet" />
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.payrollLast6Runs}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        axisLine={{ stroke: "#cbd5e1" }}
                      />
                      <YAxis
                        tick={{ fill: "#64748b", fontSize: 12 }}
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickFormatter={(v) => `₹${v / 1000}k`}
                      />
                      <Tooltip formatter={(value: any) => [formatINR(Number(value)), "Net Total"]} />
                      <Bar dataKey="netTotal" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {data.view === "MANAGER" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Team Size"
              value={data.teamSize}
              icon={<Users className="size-6" />}
            />
            <StatCard
              label="Team Present Today"
              value={data.teamPresentToday}
              icon={<UserCheck className="size-6" />}
            />
            <StatCard
              label="Team On Leave Today"
              value={data.teamOnLeaveToday}
              icon={<CalendarOff className="size-6" />}
            />
            <StatCard
              label="Pending Approvals"
              value={data.pendingApprovals}
              icon={<CheckCircle2 className="size-6" />}
            />
          </div>

          <Card className="bg-white border-slate-200 shadow-sm">
            <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Leave Approvals
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">
                  You have {data.pendingApprovals} pending leave request(s) awaiting your decision.
                </p>
              </div>
              <Link
                href="/leave/approvals"
                className={cn(
                  buttonVariants(),
                  "bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shrink-0"
                )}
              >
                <span>Review approvals</span>
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {data.view === "EMPLOYEE" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Your Leave Balances
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.leaveBalances.map((b) => (
                <Card key={b.leaveTypeId} className="bg-white border-slate-200 shadow-sm">
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      {b.leaveTypeName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-slate-900">
                      {b.remaining}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {b.isPaid ? `of ${b.allocated} days` : "Unlimited (unpaid)"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Pending Leave Requests
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-slate-900">
                    {data.pendingRequests}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Requests currently under review
                  </p>
                </div>
                <Link
                  href="/leave"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  View Requests
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900">
                  Latest Payslip
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.latestPayslip ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600">
                        {monthName(data.latestPayslip.month)} {data.latestPayslip.year}
                      </p>
                      <p className="text-2xl font-bold text-slate-900 mt-0.5">
                        {formatINR(data.latestPayslip.netPay)}
                      </p>
                    </div>
                    <Link
                      href={`/payslips/${data.latestPayslip.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      View Payslip
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No payslip yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
