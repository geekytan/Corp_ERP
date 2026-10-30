"use client";

import React, { useState } from "react";
import { useSession } from "@/components/providers/SessionProvider";
import { useApi } from "@/hooks/useApi";
import {
  AttendanceRecordDto,
  AttendanceSummaryRow,
  EmployeeListItem,
  Paginated,
} from "@/lib/types";
import { formatDate, formatMinutes, formatTime, MONTH_NAMES } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { CheckInCard } from "@/components/attendance/CheckInCard";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OptionItem {
  id: string;
  name: string;
  empCode: string;
}

export default function AttendancePage() {
  const { user } = useSession();
  const isAdminOrHr = user.role === "ADMIN" || user.role === "HR";
  const isManager = user.role === "MANAGER";

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    (currentDate.getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    currentDate.getFullYear().toString()
  );

  const [selectedEmp, setSelectedEmp] = useState<string>(
    isAdminOrHr ? "ALL" : user.employeeId
  );

  // Options for Admin/HR
  const { data: adminOptions } = useApi<OptionItem[]>(
    isAdminOrHr ? "/api/employees/options" : null
  );

  // Options for Manager
  const { data: managerEmployees } = useApi<Paginated<EmployeeListItem>>(
    isManager ? "/api/employees?pageSize=100" : null
  );

  // Records URL
  const recordsQuery = new URLSearchParams({
    month: selectedMonth,
    year: selectedYear,
  });
  if (selectedEmp !== "ALL") {
    recordsQuery.set("employeeId", selectedEmp);
  }

  const {
    data: records,
    loading: recordsLoading,
    error: recordsError,
    reload: reloadRecords,
  } = useApi<AttendanceRecordDto[]>(`/api/attendance?${recordsQuery.toString()}`);

  // Summary URL (Admin/HR only)
  const summaryQuery = new URLSearchParams({
    month: selectedMonth,
    year: selectedYear,
  });

  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
    reload: reloadSummary,
  } = useApi<AttendanceSummaryRow[]>(
    isAdminOrHr ? `/api/attendance/summary?${summaryQuery.toString()}` : null
  );

  const showEmployeeCol = selectedEmp === "ALL";

  return (
    <div>
      <PageHeader
        title="Attendance"
        subtitle="Track daily employee check-ins and monthly working summaries"
      />

      <CheckInCard
        onChange={() => {
          reloadRecords();
          if (isAdminOrHr) reloadSummary();
        }}
      />

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList className="bg-slate-200">
          <TabsTrigger value="records">
            {isAdminOrHr ? "Records" : isManager ? "My / Team Records" : "My Attendance"}
          </TabsTrigger>
          {isAdminOrHr && (
            <TabsTrigger value="summary">Monthly Summary</TabsTrigger>
          )}
        </TabsList>

        {/* Records Tab */}
        <TabsContent value="records" className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
              <SelectTrigger className="w-36 bg-white">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, idx) => (
                  <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={(val) => val && setSelectedYear(val)}>
              <SelectTrigger className="w-28 bg-white">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={(currentDate.getFullYear() - 1).toString()}>
                  {currentDate.getFullYear() - 1}
                </SelectItem>
                <SelectItem value={currentDate.getFullYear().toString()}>
                  {currentDate.getFullYear()}
                </SelectItem>
              </SelectContent>
            </Select>

            {isAdminOrHr && (
              <Select value={selectedEmp} onValueChange={(val) => val && setSelectedEmp(val)}>
                <SelectTrigger className="w-56 bg-white">
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All employees</SelectItem>
                  {adminOptions?.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name} ({o.empCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {isManager && (
              <Select value={selectedEmp} onValueChange={(val) => val && setSelectedEmp(val)}>
                <SelectTrigger className="w-56 bg-white">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={user.employeeId}>Self ({user.name})</SelectItem>
                  {managerEmployees?.items
                    .filter((e) => e.id !== user.employeeId)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.empCode})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {recordsLoading ? (
            <LoadingBlock />
          ) : recordsError ? (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600">
              {recordsError}
            </div>
          ) : !records || records.length === 0 ? (
            <EmptyState message="No attendance records for this period" />
          ) : (
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="font-semibold text-slate-700">Date</TableHead>
                      {showEmployeeCol && (
                        <TableHead className="font-semibold text-slate-700">Employee</TableHead>
                      )}
                      <TableHead className="font-semibold text-slate-700">Check In</TableHead>
                      <TableHead className="font-semibold text-slate-700">Check Out</TableHead>
                      <TableHead className="font-semibold text-slate-700">Worked</TableHead>
                      <TableHead className="font-semibold text-slate-700 w-28">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium text-slate-900">
                          {formatDate(r.date)}
                        </TableCell>
                        {showEmployeeCol && (
                          <TableCell className="text-slate-700">
                            {r.employeeName}{" "}
                            <span className="font-mono text-xs text-slate-400">
                              ({r.empCode})
                            </span>
                          </TableCell>
                        )}
                        <TableCell className="text-slate-600">
                          {formatTime(r.checkIn)}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {r.checkOut ? formatTime(r.checkOut) : "—"}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {formatMinutes(r.workedMinutes)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Summary Tab (ADMIN/HR) */}
        {isAdminOrHr && (
          <TabsContent value="summary" className="space-y-4">
            <div className="flex items-center gap-3">
              <Select value={selectedMonth} onValueChange={(val) => val && setSelectedMonth(val)}>
                <SelectTrigger className="w-36 bg-white">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, idx) => (
                    <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedYear} onValueChange={(val) => val && setSelectedYear(val)}>
                <SelectTrigger className="w-28 bg-white">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={(currentDate.getFullYear() - 1).toString()}>
                    {currentDate.getFullYear() - 1}
                  </SelectItem>
                  <SelectItem value={currentDate.getFullYear().toString()}>
                    {currentDate.getFullYear()}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {summaryLoading ? (
              <LoadingBlock />
            ) : summaryError ? (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600">
                {summaryError}
              </div>
            ) : !summary || summary.length === 0 ? (
              <EmptyState message="No summary data available for this period" />
            ) : (
              <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-semibold text-slate-700 w-24">Code</TableHead>
                        <TableHead className="font-semibold text-slate-700">Name</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">Working</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">Counted</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">Present</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">Half</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">Paid Lv</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">Unpaid Lv</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">Absent</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right font-bold text-rose-600">LOP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.map((row) => (
                        <TableRow key={row.employeeId}>
                          <TableCell className="font-mono text-xs font-semibold text-indigo-600">
                            {row.empCode}
                          </TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {row.employeeName}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {row.totalWeekdays}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {row.countedDays}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {row.presentDays}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {row.halfDays}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {row.paidLeaveDays}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {row.unpaidLeaveDays}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {row.absentDays}
                          </TableCell>
                          <TableCell className="text-right font-bold text-rose-600">
                            {row.lopDays}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
