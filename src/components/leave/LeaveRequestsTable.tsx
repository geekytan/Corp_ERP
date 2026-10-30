"use client";

import React from "react";
import { LeaveRequestDto } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeaveRequestsTableProps {
  items: LeaveRequestDto[];
  showEmployee: boolean;
  actions?: (r: LeaveRequestDto) => React.ReactNode;
}

export function LeaveRequestsTable({
  items,
  showEmployee,
  actions,
}: LeaveRequestsTableProps) {
  return (
    <Table>
      <TableHeader className="bg-slate-50">
        <TableRow>
          {showEmployee && (
            <TableHead className="font-semibold text-slate-700">Employee</TableHead>
          )}
          <TableHead className="font-semibold text-slate-700">Type</TableHead>
          <TableHead className="font-semibold text-slate-700">From</TableHead>
          <TableHead className="font-semibold text-slate-700">To</TableHead>
          <TableHead className="font-semibold text-slate-700 w-16 text-center">Days</TableHead>
          <TableHead className="font-semibold text-slate-700">Reason</TableHead>
          <TableHead className="font-semibold text-slate-700 w-28">Status</TableHead>
          <TableHead className="font-semibold text-slate-700">Reviewed By</TableHead>
          <TableHead className="font-semibold text-slate-700">Comment</TableHead>
          {actions && (
            <TableHead className="font-semibold text-slate-700 text-right w-28">
              Actions
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((req) => (
          <TableRow key={req.id}>
            {showEmployee && (
              <TableCell className="font-medium text-slate-900">
                {req.employeeName}{" "}
                <span className="font-mono text-xs text-slate-400">
                  ({req.empCode})
                </span>
              </TableCell>
            )}
            <TableCell className="font-medium text-slate-800">
              {req.leaveTypeName}
            </TableCell>
            <TableCell className="text-slate-600">
              {formatDate(req.startDate)}
            </TableCell>
            <TableCell className="text-slate-600">
              {formatDate(req.endDate)}
            </TableCell>
            <TableCell className="text-center font-semibold text-slate-700">
              {req.days}
            </TableCell>
            <TableCell className="text-slate-600 max-w-xs truncate" title={req.reason}>
              {req.reason}
            </TableCell>
            <TableCell>
              <StatusBadge status={req.status} />
            </TableCell>
            <TableCell className="text-slate-500">
              {req.reviewerName || "—"}
            </TableCell>
            <TableCell className="text-slate-500 max-w-xs truncate" title={req.reviewComment || ""}>
              {req.reviewComment || "—"}
            </TableCell>
            {actions && (
              <TableCell className="text-right">
                {actions(req)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
