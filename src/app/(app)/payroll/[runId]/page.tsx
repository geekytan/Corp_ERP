"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi";
import { api, ApiClientError } from "@/lib/api-client";
import { PayrollRunDto, PayslipDto } from "@/lib/types";
import { formatINR, monthName } from "@/lib/format";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingBlock } from "@/components/common/LoadingBlock";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { ArrowLeft, Check, Eye } from "lucide-react";

interface RunDetailResponse {
  run: PayrollRunDto;
  payslips: PayslipDto[];
}

export default function PayrollRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const { data, loading, error, reload } = useApi<RunDetailResponse>(
    `/api/payroll/runs/${runId}`
  );

  const [payingId, setPayingId] = useState<string | null>(null);

  const handleMarkPaid = async (payslipId: string) => {
    setPayingId(payslipId);
    try {
      await api.patch(`/api/payroll/payslips/${payslipId}/pay`);
      toast.success("Payslip marked as paid");
      reload();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        toast.error(err.message);
      } else {
        toast.error("Failed to mark payslip as paid");
      }
    } finally {
      setPayingId(null);
    }
  };

  if (loading) return <LoadingBlock />;
  if (error || !data) {
    return (
      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-red-600">
        <p>{error || "Payroll run not found"}</p>
      </div>
    );
  }

  const { run, payslips } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Link
          href="/payroll"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-1 text-slate-500"
          )}
        >
          <ArrowLeft className="size-4" />
          <span>Back to payroll</span>
        </Link>
      </div>

      <PageHeader
        title={`Payroll – ${monthName(run.month)} ${run.year}`}
        subtitle={`${run.payslipCount} payslips • Total net pay ${formatINR(
          run.totalNetPay
        )}`}
      />

      <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-semibold text-slate-700 w-24">Code</TableHead>
                <TableHead className="font-semibold text-slate-700">Name</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">Present</TableHead>
                <TableHead className="font-semibold text-slate-700 text-center">LOP</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Gross</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Deductions</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Net Pay</TableHead>
                <TableHead className="font-semibold text-slate-700 w-28">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right w-36">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payslips.map((ps) => (
                <TableRow key={ps.id}>
                  <TableCell className="font-mono text-xs font-semibold text-indigo-600">
                    {ps.empCode}
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {ps.employeeName}
                  </TableCell>
                  <TableCell className="text-center text-slate-600">
                    {ps.presentDays}
                  </TableCell>
                  <TableCell className="text-center text-rose-600 font-semibold">
                    {ps.lopDays}
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
                  <TableCell className="text-right space-x-1.5">
                    <Link
                      href={`/payslips/${ps.id}`}
                      title="View Payslip"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "text-slate-600 hover:text-indigo-600 h-8 px-2"
                      )}
                    >
                      <Eye className="size-3.5 mr-1" />
                      <span>View</span>
                    </Link>

                    {ps.status === "GENERATED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8 px-2"
                        onClick={() => handleMarkPaid(ps.id)}
                        disabled={payingId === ps.id}
                      >
                        <Check className="size-3.5 mr-1" />
                        <span>{payingId === ps.id ? "..." : "Pay"}</span>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
