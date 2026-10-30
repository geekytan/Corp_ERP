"use client";

import React from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { PayslipDto } from "@/lib/types";
import { formatINR, monthName } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Eye } from "lucide-react";

export default function MyPayslipsPage() {
  const { data: payslips, loading, error } = useApi<PayslipDto[]>("/api/payslips");

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Payslips"
        subtitle="View and download your monthly salary statements"
      />

      {loading ? (
        <LoadingBlock />
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600">
          {error}
        </div>
      ) : !payslips || payslips.length === 0 ? (
        <EmptyState message="No payslips available yet" />
      ) : (
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Period</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Gross Earnings</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Deductions</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right">Net Pay</TableHead>
                  <TableHead className="font-semibold text-slate-700 w-28">Status</TableHead>
                  <TableHead className="font-semibold text-slate-700 text-right w-24">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map((ps) => (
                  <TableRow key={ps.id}>
                    <TableCell className="font-semibold text-slate-900">
                      {monthName(ps.month)} {ps.year}
                    </TableCell>
                    <TableCell className="text-right text-slate-600">
                      {formatINR(ps.grossEarnings)}
                    </TableCell>
                    <TableCell className="text-right text-slate-600">
                      {formatINR(ps.totalDeductions)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatINR(ps.netPay)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ps.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/payslips/${ps.id}`}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "sm" }),
                          "text-slate-600 hover:text-indigo-600 h-8 px-2"
                        )}
                      >
                        <Eye className="size-3.5 mr-1" />
                        <span>View</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
